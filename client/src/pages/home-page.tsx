import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Copy, Store, PlusCircle, ChevronDown, Loader2, Download, Upload, Trash2, MoreVertical, Pencil, Globe, Image as ImageIcon, QrCode } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { type Restaurant, type MenuItem, type InsertMenuItem, insertMenuItemSchema, insertRestaurantSchema } from "@shared/schema";
import { useState, useEffect, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { Dropbox } from 'dropbox';
import { QRCodeSVG } from 'qrcode.react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

// Remove the hardcoded token and use environment variables
const DROPBOX_ACCESS_TOKEN = import.meta.env.VITE_DROPBOX_ACCESS_TOKEN || '';

const refreshDropboxToken = async () => {
  try {
    const response = await fetch('https://api.dropbox.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${import.meta.env.VITE_DROPBOX_APP_KEY}:${import.meta.env.VITE_DROPBOX_APP_SECRET}`)}`
      },
      body: new URLSearchParams({
        'grant_type': 'refresh_token',
        'refresh_token': import.meta.env.VITE_DROPBOX_REFRESH_TOKEN || ''
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error_description || 'Failed to refresh token');
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Error refreshing token:', error);
    throw error;
  }
};

const createDropboxClient = (accessToken: string) => new Dropbox({
  accessToken,
  fetch: (url: string, init?: RequestInit) => {
    if (init) {
      init.headers = {
        ...init.headers,
        'Authorization': `Bearer ${accessToken}`,
      };
    }
    return fetch(url, init);
  }
});

let dbx = createDropboxClient(DROPBOX_ACCESS_TOKEN);

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [isCreateMenuItemOpen, setCreateMenuItemOpen] = useState(false);
  const [isCreateRestaurantOpen, setCreateRestaurantOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImageUploadDialogOpen, setIsImageUploadDialogOpen] = useState(false);
  const imageUploadRef = useRef<HTMLInputElement>(null);
  const [showQrCode, setShowQrCode] = useState(false); // Added state for QR code dialog
  const qrCodeRef = useRef<HTMLDivElement>(null);

  const form = useForm<InsertMenuItem>({
    resolver: zodResolver(insertMenuItemSchema),
    defaultValues: {
      name: "",
      name_original: "",
      description: "",
      price: "",
      courseTags: [],
      course_original: "",
      restaurantId: 0,
      image: "",
      allergens: {
        milk: false,
        eggs: false,
        peanuts: false,
        nuts: false,
        shellfish: false,
        fish: false,
        soy: false,
        gluten: false,
      },
    },
  });

  const handleImageDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        form.setValue("image", reader.result as string, { shouldValidate: true });
      };
      reader.readAsDataURL(file);
    } else {
      toast({
        title: "Error",
        description: "Please upload an image file",
        variant: "destructive",
      });
    }
  }, [form, toast]);

  const { data: restaurants, isLoading: isLoadingRestaurants } = useQuery<Restaurant[]>({
    queryKey: ["/api/restaurants"],
    enabled: !!user?.id,
    staleTime: 0,
  });

  const { data: menuItems, isLoading: isLoadingMenuItems } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu-items", selectedRestaurant?.id],
    queryFn: async () => {
      if (!selectedRestaurant?.id) return [];
      const response = await apiRequest("GET", `/api/menu-items?restaurantId=${selectedRestaurant.id}`);
      if (!response.ok) throw new Error("Failed to fetch menu items");
      return response.json();
    },
    enabled: !!selectedRestaurant?.id && !!user?.id,
    staleTime: 0,
  });

  const handleExportCSV = async () => {
    if (!selectedRestaurant?.id) return;

    try {
      const response = await fetch(`/api/restaurants/${selectedRestaurant.id}/menu/export`);
      if (!response.ok) throw new Error('Failed to export menu');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedRestaurant.name.toLowerCase().replace(/[^a-z0-9]/gi, '_')}_menu.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export menu",
        variant: "destructive",
      });
    }
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedRestaurant?.id) return;
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const csvData = event.target?.result as string;
          if (!csvData || typeof csvData !== 'string') {
            throw new Error("Could not read CSV data");
          }

          const lines = csvData.split(/\r?\n/).filter(line => line.trim());
          if (lines.length < 2) {
            throw new Error("CSV must contain a header row and at least one data row");
          }

          const response = await fetch(`/api/restaurants/${selectedRestaurant.id}/menu/import`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ csvData }),
          });

          const result = await response.json();
          if (!response.ok) {
            throw new Error(result.message || 'Failed to import menu items');
          }

          e.target.value = '';
          setIsImportDialogOpen(false);

          const successMessage = `Successfully imported ${result.success} items.`;
          const failureMessage = result.failed > 0
            ? `\nFailed to import ${result.failed} items.${
                result.errors?.length ? `\nErrors:\n${result.errors.join('\n')}` : ''
              }`
            : '';

          toast({
            title: result.failed > 0 ? "Import Completed with Errors" : "Import Complete",
            description: successMessage + failureMessage,
            variant: result.failed > 0 ? "destructive" : "default",
            duration: result.failed > 0 ? 10000 : 3000,
          });

          queryClient.invalidateQueries({ queryKey: ["/api/menu-items", selectedRestaurant.id] });
        } catch (error) {
          console.error('Error importing CSV:', error);
          toast({
            title: "Import Error",
            description: error instanceof Error ? error.message : "Failed to import menu items",
            variant: "destructive",
          });
        }
      };

      reader.readAsText(file);
    } catch (error) {
      console.error('Error reading file:', error);
      toast({
        title: "Error",
        description: "Failed to read the CSV file",
        variant: "destructive",
      });
    }
  };

  const parseAllergens = (allergensStr: string) => {
    const allergenList = allergensStr ? allergensStr.split(';').map(a => a.trim().toLowerCase()) : [];
    return {
      milk: allergenList.includes('milk'),
      eggs: allergenList.includes('eggs'),
      peanuts: allergenList.includes('peanuts'),
      nuts: allergenList.includes('nuts'),
      shellfish: allergenList.includes('shellfish'),
      fish: allergenList.includes('fish'),
      soy: allergenList.includes('soy'),
      gluten: allergenList.includes('gluten')
    };
  };


  useEffect(() => {
    if (editingItem) {
      console.log("Setting form data for editing:", editingItem);
      const formData = {
        name: editingItem.name,
        name_original: editingItem.name_original || "",
        description: editingItem.description,
        price: editingItem.price,
        image: editingItem.image || "",
        courseTags: editingItem.courseTags || [],
        course_original: editingItem.course_original || "",
        allergens: editingItem.allergens || {
          milk: false,
          eggs: false,
          peanuts: false,
          nuts: false,
          shellfish: false,
          fish: false,
          soy: false,
          gluten: false,
        },
        restaurantId: editingItem.restaurantId,
      };
      form.reset(formData);
      setCreateMenuItemOpen(true);
    }
  }, [editingItem, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: InsertMenuItem & { id: number }) => {
      const { id, ...updateData } = data;
      console.log("Updating menu item:", { id, ...updateData });

      const response = await apiRequest("PATCH", `/api/menu-items/${id}`, updateData);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update menu item");
      }
      return response.json();
    },
    onSuccess: () => {
      console.log("Update successful");
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items", selectedRestaurant?.id] });
      setCreateMenuItemOpen(false);
      setEditingItem(null);
      form.reset();
      toast({
        title: "Success",
        description: "Menu item updated successfully",
      });
    },
    onError: (error: Error) => {
      console.error("Update failed:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertMenuItem) => {
      if (!selectedRestaurant?.id) {
        throw new Error("No restaurant selected");
      }

      const menuItem = {
        ...data,
        restaurantId: selectedRestaurant.id,
      };

      const response = await apiRequest("POST", "/api/menu-items", menuItem);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create menu item");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items", selectedRestaurant?.id] });
      setCreateMenuItemOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Menu item created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: InsertMenuItem) => {
    console.log("Form submitted with data:", data);

    const formattedData = {
      ...data,
      restaurantId: selectedRestaurant!.id,
      // Handle empty price - store empty string instead of null
      price: data.price?.trim() || '',
    };

    if (editingItem) {
      updateMutation.mutate({
        ...formattedData,
        id: editingItem.id,
      });
    } else {
      createMutation.mutate(formattedData);
    }
  };

  const createRestaurantForm = useForm({
    resolver: zodResolver(insertRestaurantSchema),
    defaultValues: {
      name: "",
      userId: user?.id || 0,
    },
  });

  const createRestaurantMutation = useMutation({
    mutationFn: async (data: { name: string }) => {
      const restaurant = {
        ...data,
        userId: user?.id || 0,
      };

      const response = await apiRequest("POST", "/api/restaurants", restaurant);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create restaurant");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants"] });
      setCreateRestaurantOpen(false);
      createRestaurantForm.reset();
      toast({
        title: "Success",
        description: "Restaurant created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const results = await Promise.all(
        ids.map((id) => apiRequest("DELETE", `/api/menu-items/${id}`))
      );
      const errors = results.filter((res) => !res.ok);
      if (errors.length > 0) {
        throw new Error(`Failed to delete ${errors.length} items`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items", selectedRestaurant?.id] });
      setSelectedItems([]);
      toast({
        title: "Success",
        description: "Selected items have been deleted",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async ({ id, displayOrder }: { id: number; displayOrder: number }) => {
      const response = await apiRequest("PATCH", `/api/menu-items/${id}`, { displayOrder });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to reorder menu items");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items", selectedRestaurant?.id] });
      toast({
        title: "Success",
        description: "Menu items reordered successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!selectedRestaurant && restaurants?.length) {
      setSelectedRestaurant(restaurants[0]);
    }
  }, [restaurants, selectedRestaurant]);

  const handleDialogOpenChange = (open: boolean) => {
    setCreateMenuItemOpen(open);
    if (!open) {
      console.log("Resetting form and edit state");
      setEditingItem(null);
      form.reset();
    }
  };

  const toggleItemSelection = (id: number) => {
    setSelectedItems((prev) =>
      prev.includes(id)
        ? prev.filter((itemId) => itemId !== id)
        : [...prev, id]
    );
  };

  const handleDeleteSelected = () => {
    if (selectedItems.length === 0) return;
    deleteMutation.mutate(selectedItems);
  };

  const groupedMenuItems = menuItems?.reduce((groups, item) => {
    const group = item.courseTags;
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(item);
    return groups;
  }, {} as Record<string, MenuItem[]>) || {};

  const getPublicMenuUrl = (restaurantId: number) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/menu/${restaurantId}`;
  };

  const copyMenuUrl = async (restaurantId: number) => {
    const url = getPublicMenuUrl(restaurantId);
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Success",
        description: "Menu URL copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy URL",
        variant: "destructive",
      });
    }
  };

  const handleImportClick = () => {
    setIsImportDialogOpen(true);
  };

  const handleContinueImport = () => {
    setIsImportDialogOpen(false);
    fileInputRef.current?.click();
  };

  const handleImageUploadClick = () => {
    setIsImageUploadDialogOpen(true);
  };

  const handleContinueImageUpload = () => {
    setIsImageUploadDialogOpen(false);
    imageUploadRef.current?.click();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedRestaurant?.id) return;
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const imageData = reader.result as ArrayBuffer;
        if (!imageData) {
          throw new Error("Could not read image data");
        }

        const timestamp = new Date().getTime();
        const fileName = `RestaurantID-${selectedRestaurant.id}_${timestamp}_${file.name}`;
        const filePath = `/Magic Menu/${fileName}`;

        const uploadWithRetry = async (retryCount = 0) => {
          try {
            await dbx.filesUpload({
              path: filePath,
              contents: imageData,
              mode: { '.tag': 'add' },
              autorename: true,
              strict_conflict: false,
              mute: false
            });

            // Clear the input value and close dialog
            e.target.value = '';
            setIsImageUploadDialogOpen(false);

            toast({
              title: "Success",
              description: "Menu image uploaded successfully",
            });
          } catch (error: any) {
            if (error?.status === 401 && retryCount < 1) {
              try {
                // Refresh token and retry upload
                const newToken = await refreshDropboxToken();
                dbx = createDropboxClient(newToken);
                return uploadWithRetry(retryCount + 1);
              } catch (refreshError) {
                console.error('Error refreshing token:', refreshError);
                throw new Error('Failed to refresh access token');
              }
            }
            throw error;
          }
        };

        try {
          await uploadWithRetry();
        } catch (error) {
          console.error('Upload error:', error);
          toast({
            title: "Error",
            description: error instanceof Error ? error.message : "Failed to upload image",
            variant: "destructive",
          });
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Error reading file:', error);
      toast({
        title: "Error",
        description: "Failed to read the image file",
        variant: "destructive",
      });
    }
  };


  const handleDownloadPDF = async () => {
    if (!qrCodeRef.current || !selectedRestaurant) return;

    try {
      const canvas = await html2canvas(qrCodeRef.current);
      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Calculate dimensions to center the QR code on the page
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const qrSize = 100; // Size in mm
      const x = (pdfWidth - qrSize) / 2;
      const y = (pdfHeight - qrSize) / 2;

      // Add restaurant name as title
      pdf.setFontSize(16);
      pdf.text(selectedRestaurant.name, pdfWidth / 2, y - 20, { align: 'center' });

      // Add QR code
      pdf.addImage(imgData, 'PNG', x, y, qrSize, qrSize);

      // Add URL text below QR code
      pdf.setFontSize(10);
      const url = getPublicMenuUrl(selectedRestaurant.id);
      pdf.text(url, pdfWidth / 2, y + qrSize + 10, { align: 'center' });

      pdf.save(`${selectedRestaurant.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_menu_qr.pdf`);

      toast({
        title: "Success",
        description: "QR code has been downloaded as PDF",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate PDF",
        variant: "destructive",
      });
    }
  };

  if (!restaurants?.length && !isLoadingRestaurants) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Please create a restaurant first</p>
      </div>
    );
  }

  if (isLoadingRestaurants || isLoadingMenuItems) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin h-12 w-12" />
      </div>
    );
  }

  const MenuCard = ({ item }: { item: MenuItem }) => {
    return (
      <div className="flex items-center justify-between gap-4 p-4">
        <div>
          <h3 className="font-medium">{item.name}</h3>
          <p className="text-sm text-muted-foreground">{item.description}</p>
          <span className="font-semibold">
            {item.price && parseFloat(item.price) > 0 ? `$${parseFloat(item.price).toFixed(2)}` : ''}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(item.allergens)
            .filter(([_, value]) => value)
            .map(([key]) => (
              <span
                key={key}
                className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full capitalize"
              >
                {key}
              </span>
            ))}
        </div>
      </div>
    );
  };

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const { source, destination } = result;
    const sourceTag = source.droppableId;
    const destTag = destination.droppableId;

    if (sourceTag === destTag) {
      const items = Array.from(groupedMenuItems[sourceTag] || []);
      const [reorderedItem] = items.splice(source.index, 1);
      items.splice(destination.index, 0, reorderedItem);

      // Update displayOrder for all affected items
      await Promise.all(
        items.map((item, index) =>
          reorderMutation.mutate({ id: item.id, displayOrder: index })
        )
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="fixed top-0 left-0 right-0 z-50 bg-gray-50 p-4 md:p-8 border-b">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-2">
                <Store className="h-8 w-8" />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="font-bold text-xl flex items-center gap-2">
                      {selectedRestaurant?.name || restaurants?.[0]?.name}
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-[200px]">
                    {restaurants?.map((restaurant) => (
                      <DropdownMenuItem
                        key={restaurant.id}
                        onClick={() => setSelectedRestaurant(restaurant)}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span>{restaurant.name}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyMenuUrl(restaurant.id);
                            }}
                          >
                            <Globe className="h-4 w-4" />
                          </Button>
                        </div>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setCreateRestaurantOpen(true)}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add New Restaurant
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <Button variant="outline" onClick={() => logoutMutation.mutate()} className="md:ml-auto">
                Logout
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
              {selectedRestaurant && (
                <>
                  <Button
                    variant="outline"
                    className="flex items-center gap-2 w-full sm:w-auto"
                    onClick={() => copyMenuUrl(selectedRestaurant.id)}
                  >
                    <Globe className="h-4 w-4" />
                    Copy Menu URL
                  </Button>
                  <Button
                    variant="outline"
                    className="flex items-center gap-2 w-full sm:w-auto"
                    onClick={() => setShowQrCode(true)}
                  >
                    <QrCode className="h-4 w-4" />
                    QR Code
                  </Button>
                </>
              )}
              <Button
                onClick={() => setCreateMenuItemOpen(true)}
                className="w-full sm:w-auto"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Menu Item
              </Button>
              {selectedItems.length > 0 && (
                <Button
                  variant="destructive"
                  onClick={handleDeleteSelected}
                  disabled={deleteMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  {deleteMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Delete Selected ({selectedItems.length})
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handleExportCSV}
                className="w-full sm:w-auto"
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
              <Button variant="outline" className="w-full sm:w-auto" onClick={handleImportClick}>
                <Upload className="mr-2 h-4 w-4" />
                Import CSV
              </Button>
              <Button variant="outline" className="w-full sm:w-auto" onClick={handleImageUploadClick}>
                <ImageIcon className="mr-2 h-4 w-4" />
                Upload Menu Image
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleImportCSV}
                className="hidden"
              />
              <input
                ref={imageUploadRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-8 mt-[160px] md:mt-[160px]">
        <div className="max-w-4xl mx-auto">
          <Dialog open={isCreateRestaurantOpen} onOpenChange={setCreateRestaurantOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Restaurant</DialogTitle>
              </DialogHeader>
              <form onSubmit={createRestaurantForm.handleSubmit((data) => createRestaurantMutation.mutate(data))} className="space-y-4">
                <div>
                  <Label htmlFor="name">Restaurant Name</Label>
                  <Input id="name" {...createRestaurantForm.register("name")} />
                  {createRestaurantForm.formState.errors.name && (
                    <p className="text-sm text-destructive mt-1">
                      {createRestaurantForm.formState.errors.name.message}
                    </p>
                  )}
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={createRestaurantMutation.isPending}
                >
                  {createRestaurantMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Create Restaurant
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isCreateMenuItemOpen} onOpenChange={handleDialogOpenChange}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingItem ? 'Edit Menu Item' : 'Add Menu Item'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input {...form.register("name")} />
                  {form.formState.errors.name && (
                    <p className="text-sm text-destructive mt-1">{form.formState.errors.name.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="name_original">Original Name</Label>
                  <Input {...form.register("name_original")} placeholder="Leave empty if same as Name" />
                  {form.formState.errors.name_original && (
                    <p className="text-sm text-destructive mt-1">{form.formState.errors.name_original.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea {...form.register("description")} />
                  {form.formState.errors.description && (
                    <p className="text-sm text-destructive mt-1">{form.formState.errors.description.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="price">Price (optional)</Label>
                  <Input {...form.register("price")} placeholder="Leave empty for no price" />
                  {form.formState.errors.price && (
                    <p className="text-sm text-destructive mt-1">{form.formState.errors.price.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="courseTags">Course Tags</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {form.watch("courseTags").map((tag, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {tag}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => {
                            const newTags = [...form.getValues("courseTags")];
                            newTags.splice(index, 1);
                            form.setValue("courseTags", newTags);
                          }}
                        />
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a new tag"
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const value = e.currentTarget.value.trim();
                          if (value && !form.getValues("courseTags").includes(value)) {
                            form.setValue("courseTags", [...form.getValues("courseTags"), value]);
                            e.currentTarget.value = "";
                          }
                        }
                      }}
                    />
                  </div>
                  <div className="mt-2">
                    <Label htmlFor="course_original">Original Course</Label>
                    <Input {...form.register("course_original")} placeholder="Original course category if different" />
                    {form.formState.errors.course_original && (
                      <p className="text-sm text-destructive mt-1">{form.formState.errors.course_original.message}</p>
                    )}
                  </div>
                </div>
                <div>
                  <Label htmlFor="image">Image</Label>
                  <div
                    className="border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:border-primary transition-colors"
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={handleImageDrop}
                  >
                    <Input
                      id="image"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            form.setValue("image", reader.result as string, { shouldValidate: true });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                    />
                    <p className="text-sm text-muted-foreground mt-2">
                      Drag and drop an image here or click to select
                    </p>
                    {form.watch("image") && (
                      <div className="mt-4 relative">
                        <img
                          src={form.watch("image")}
                          alt="Preview"
                          className="max-w-full h-auto max-h-48 rounded"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => form.setValue("image", "", { shouldValidate: true })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  {form.formState.errors.image && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.image.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label>Allergens</Label>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    {(Object.keys(form.getValues().allergens) as Array<keyof InsertMenuItem['allergens']>).map((key) => (
                      <div key={key} className="flex items-center space-x-2">
                        <Checkbox
                          id={key}
                          checked={form.getValues().allergens[key]}
                          onCheckedChange={(checked) => {
                            form.setValue(`allergens.${key}`, checked as boolean, { shouldValidate: true });
                          }}
                        />
                        <Label htmlFor={key} className="capitalize">
                          {key}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editingItem ? "Update Menu Item" : "Create Menu Item"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>CSV Import Instructions</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  To successfully import menu items, please follow these steps:
                </p>

                <div className="bg-amber-100 p-4 rounded-md border border-amber-200">
                  <h3 className="font-medium mb-2">Important: Use the Export Template</h3>
                  <p className="text-sm">
                    For best results, first click "Export CSV" to download a template with the correct format.
                    Then add your new items to this file.
                  </p>
                </div>

                <p className="text-sm">Your CSV file should follow this structure:</p>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Course Tags</TableHead>
                      <TableHead>Custom Tags</TableHead>
                      <TableHead>Allergens</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>Taco</TableCell>
                      <TableCell>Tasty</TableCell>
                      <TableCell>2.49</TableCell>
                      <TableCell>Mains</TableCell>
                      <TableCell></TableCell>
                      <TableCell>milk</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>

                <div className="text-sm space-y-2">
                  <p><strong>Guidelines:</strong></p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Course Tags should be a valid tag (This needs to be defined based on the schema)</li>
                    <li>Price should be a decimal number (e.g., 2.49)</li>
                    <li>Custom Tags should be semicolon-separated (e.g., "Spicy;Vegetarian")</li>
                    <li>Allergens should be semicolon-separated, valid options: milk, eggs, peanuts, nuts, shellfish, fish, soy, gluten</li>
                  </ul>
                </div>
              </div>

              <DialogFooter className="flex gap-2">
                <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
                  Go back
                </Button>
                <Button onClick={handleExportCSV} className="mr-2">
                  <Download className="mr-2 h-4 w-4" />
                  Export Template
                </Button>
                <Button onClick={handleContinueImport}>
                  Continue Import
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isImageUploadDialogOpen} onOpenChange={setIsImageUploadDialogOpen}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Upload Menu Image</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  To upload a full menu image, please follow these guidelines:
                </p>

                <div className="bg-amber-100 p-4 rounded-md border border-amber-200">
                  <h3 className="font-medium mb-2">Image Requirements</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>High-resolution images of your complete menu</li>
                    <li>Supported formats: JPG, PNG, GIF</li>
                    <li>Maximum file size: 5MB</li>
                    <li>Ensure the menu text is clear and readable</li>
                  </ul>
                </div>
              </div>

              <DialogFooter className="flex gap-2">
                <Button variant="outline" onClick={() => setIsImageUploadDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleContinueImageUpload}>
                  Choose Image
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showQrCode} onOpenChange={setShowQrCode}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Menu QR Code</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center justify-center p-6" ref={qrCodeRef}>
                <QRCodeSVG
                  value={selectedRestaurant ? getPublicMenuUrl(selectedRestaurant.id) : ''}
                  size={256}
                  level="H"
                  includeMargin={true}
                />
                {selectedRestaurant && (
                  <p className="mt-4 text-sm text-center text-muted-foreground">
                    {getPublicMenuUrl(selectedRestaurant.id)}
                  </p>
                )}
              </div>
              <DialogFooter className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="secondary"
                  className="flex items-center gap-2"
                  onClick={handleDownloadPDF}
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </Button>
                <Button variant="secondary" onClick={() => setShowQrCode(false)}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <DragDropContext onDragEnd={handleDragEnd}>
            {Object.entries(groupedMenuItems).map(([tag, items]) => (
              <div key={tag} className="mb-8">
                <h2 className="text-xl font-semibold mb-4">{tag}</h2>
                <Droppable droppableId={tag}>
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="space-y-4"
                    >
                      {items
                        .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
                        .map((item, index) => (
                          <Draggable
                            key={item.id}
                            draggableId={item.id.toString()}
                            index={index}
                          >
                            {(provided) => (
                              <Card
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className="bg-white"
                              >
                                <CardContent className="p-4">
                                  <MenuCard item={item} />
                                </CardContent>
                              </Card>
                            )}
                          </Draggable>
                        ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </DragDropContext>
        </div>
      </div>
    </div>
  );
}