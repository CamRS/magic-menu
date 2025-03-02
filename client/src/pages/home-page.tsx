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
import { Copy, Store, PlusCircle, ChevronDown, Loader2, Download, Upload, Trash2, MoreVertical, Pencil, Globe, Image as ImageIcon } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { type Restaurant, type MenuItem, type InsertMenuItem, insertMenuItemSchema, insertRestaurantSchema, courseTypes } from "@shared/schema";
import { useState, useEffect, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { Dropbox } from 'dropbox';

// Initialize Dropbox client with environment variable and headers
const dbx = new Dropbox({
  accessToken: 'sl.u.AFmLAQYIzoJQvIvfpOCfaezyWRWDvAMWAEyYavfg8i2Cq2Ms_4OqBgxxbuxXODPC7Ohv90dUJrbisPfBMnZvpcSIKHleVG9Dee1zdl8k6o2IUVui0Yaz97ksnMdO--47uQwKE5ZJlnY-3RMDzJDsr4r6wSAJlVSxJhepbm0Yl8_Xji42ji1ByYbSynzBrIxRPcrL6yJqHf1KnTyev-WqhYJCr7LHHKc9XNx8gKMYo7Co8_gJHawVYPbh89OpZHpbVKyZgsCd2bhO6hEJ9pTzBJMni_avwk0sBqogC3jnGK7-g2itcQYPVaOu6C-9EWmFSZh9Vl5MdHX3kx8gy9yBZYnxTQGnRSBY0-e5FZek0lnor-Cq4sg1FxXgyGZHpdqIkHnIZofAs43RzPNFP7ZXZ422yykTqywXzdH9POk8fmJ3zIvi-IlPg-bmplIfjaPfS9jLTBuWJSuQWT7HDTB-YtjWkmgrHWA5yb_fzGlyq3cFusSMVTFCUxqGWAtGRnI0Kbbl11Ky7bnesNBCbfy303-Fq9rN9qNVBY7N-gV-ZO6gkTInO9xcgmH0B9jKUZWXeZ1jQXW2mXPwMnjCU0f4tzQZ1MkMV27H08jGsV6i_G5GJ9QsM3Uo1Oh9nu-Q9v3DBVAKfw8ZHo0iiOpYpvYRL3T7DX-DuJckcw0ilZ9R4-aEcqenRdd3kqYTWBV6zAj6JiSspbxO5Jjgu_jLegVOn7WJmvggwOit-1zrCqgRytpMZfF7gumNEPRsh0-n4VCsJJYIxWAFvxi0zy3iIv75Mq0pYstKnoytNTwn_rbF0RrAJ-twpdkk8onG04CWDOhVdcjaq7-Ida2rBO3csGQ4Nqcprirxgecn3p0VEr_Sd1lCT2z_jYx8w_gvVq_RG2_WRUah2VleNJTRvweV-XX57BZTKs-l4v-NO1SLZIslKe5VqA7pbSSKIBmZwhuvgvPwfaop3JeujgOo-KcEwfl6EXCPWL9gayEeK_As4DSNAtlAnTAL6N_fb9ugIzQYdoPn3J1UgqhnYapa2lWbqInodZMBf8RgIuso3MVelEDZfr9hqMyJrmy8xw_pr4k0o9dCOpE7WZotzl98W3fnEkr3emMtD4RUujGF1QQlynkCq0BqpPVYTtfWAjegKpZdVu_u89P3R87gKCh86SeXTuiA82e0Bvw1qp-LKWqlTuyCbL8wnUZWCu0pm6koIySSH-Ug-UAUofnoHyldjAKtkFBSHZU67TFnMSuTarwwrLSb9ICpDxBpKa6hrOL38a_5aPJP-oSp-_ZI3UW5IsbJr63gciWF',
  fetch: (url: string, init?: RequestInit) => {
    if (init) {
      init.headers = {
        ...init.headers,
        'Authorization': `Bearer sl.u.AFmLAQYIzoJQvIvfpOCfaezyWRWDvAMWAEyYavfg8i2Cq2Ms_4OqBgxxbuxXODPC7Ohv90dUJrbisPfBMnZvpcSIKHleVG9Dee1zdl8k6o2IUVui0Yaz97ksnMdO--47uQwKE5ZJlnY-3RMDzJDsr4r6wSAJlVSxJhepbm0Yl8_Xji42ji1ByYbSynzBrIxRPcrL6yJqHf1KnTyev-WqhYJCr7LHHKc9XNx8gKMYo7Co8_gJHawVYPbh89OpZHpbVKyZgsCd2bhO6hEJ9pTzBJMni_avwk0sBqogC3jnGK7-g2itcQYPVaOu6C-9EWmFSZh9Vl5MdHX3kx8gy9yBZYnxTQGnRSBY0-e5FZek0lnor-Cq4sg1FxXgyGZHpdqIkHnIZofAs43RzPNFP7ZXZ422yykTqywXzdH9POk8fmJ3zIvi-IlPg-bmplIfjaPfS9jLTBuWJSuQWT7HDTB-YtjWkmgrHWA5yb_fzGlyq3cFusSMVTFCUxqGWAtGRnI0Kbbl11Ky7bnesNBCbfy303-Fq9rN9qNVBY7N-gV-ZO6gkTInO9xcgmH0B9jKUZWXeZ1jQXW2mXPwMnjCU0f4tzQZ1MkMV27H08jGsV6i_G5GJ9QsM3Uo1Oh9nu-Q9v3DBVAKfw8ZHo0iiOpYpvYRL3T7DX-DuJckcw0ilZ9R4-aEcqenRdd3kqYTWBV6zAj6JiSspbxO5Jjgu_jLegVOn7WJmvggwOit-1zrCqgRytpMZfF7gumNEPRsh0-n4VCsJJYIxWAFvxi0zy3iIv75Mq0pYstKnoytNTwn_rbF0RrAJ-twpdkk8onG04CWDOhVdcjaq7-Ida2rBO3csGQ4Nqcprirxgecn3p0VEr_Sd1lCT2z_jYx8w_gvVq_RG2_WRUah2VleNJTRvweV-XX57BZTKs-l4v-NO1SLZIslKe5VqA7pbSSKIBmZwhuvgvPwfaop3JeujgOo-KcEwfl6EXCPWL9gayEeK_As4DSNAtlAnTAL6N_fb9ugIzQYdoPn3J1UgqhnYapa2lWbqInodZMBf8RgIuso3MVelEDZfr9hqMyJrmy8xw_pr4k0o9dCOpE7WZotzl98W3fnEkr3emMtD4RUujGF1QQlynkCq0BqpPVYTtfWAjegKpZdVu_u89P3R87gKCh86SeXTuiA82e0Bvw1qp-LKWqlTuyCbL8wnUZWCu0pm6koIySSH-Ug-UAUofnoHyldjAKtkFBSHZU67TFnMSuTarwwrLSb9ICpDxBpKa6hrOL38a_5aPJP-oSp-_ZI3UW5IsbJr63gciWF`,
      };
    }
    return fetch(url, init);
  }
});

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

  const form = useForm<InsertMenuItem>({
    resolver: zodResolver(insertMenuItemSchema),
    defaultValues: {
      name: "",
      description: "",
      price: "",
      courseType: "Appetizers",
      customTags: [],
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
        description: editingItem.description,
        price: editingItem.price,
        image: editingItem.image || "",
        customTags: editingItem.customTags || [],
        courseType: editingItem.courseType as typeof courseTypes[number],
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

    if (editingItem) {
      console.log("Updating existing item:", editingItem.id); 
      const updateData = {
        ...data,
        id: editingItem.id,
        restaurantId: editingItem.restaurantId,
      };
      updateMutation.mutate(updateData);
    } else {
      createMutation.mutate({
        ...data,
        restaurantId: selectedRestaurant!.id,
      });
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
    const group = item.courseType;
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

        try {
          // Upload file directly to Magic Menu folder
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
                <Button
                  variant="outline"
                  className="flex items-center gap-2 w-full sm:w-auto"
                  onClick={() => copyMenuUrl(selectedRestaurant.id)}
                >
                  <Globe className="h-4 w-4" />
                  Copy Menu URL
                </Button>
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
                  <Label htmlFor="description">Description</Label>
                  <Textarea {...form.register("description")} />
                  {form.formState.errors.description && (
                    <p className="text-sm text-destructive mt-1">{form.formState.errors.description.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="price">Price</Label>
                  <Input {...form.register("price")} />
                  {form.formState.errors.price && (
                    <p className="text-sm text-destructive mt-1">{form.formState.errors.price.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="courseType">Course Type</Label>
                  <Select
                    onValueChange={(value) => form.setValue("courseType", value as any)}
                    defaultValue={form.getValues("courseType")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select course type" />
                    </SelectTrigger>
                    <SelectContent>
                      {courseTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.courseType && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.courseType.message}
                    </p>
                  )}
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
                      <img
                        src={form.watch("image")}
                        alt="Preview"
                        className="mt-4 max-h-40 rounded-lg"
                      />
                    )}
                  </div>
                  {form.formState.errors.image && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.image.message}
                    </p>
                  )}
                </div>
                {form.watch("courseType") === "Custom" && (
                  <div>
                    <Label htmlFor="customTag">Custom Tags</Label>
                    <div className="flex gap-2 mb-2">
                      {form.watch("customTags").map((tag, index) => (
                        <Badge key={index} variant="secondary" className="flex items-center gap-1">
                          {tag}
                          <X
                            className="h-3 w-3 cursor-pointer"
                            onClick={() => {
                              const newTags = [...form.getValues("customTags")];
                              newTags.splice(index, 1);
                              form.setValue("customTags",newTags);
                            }}
                          />
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        id="customTag"
                        placeholder="Add a custom tag"
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const input = e.currentTarget;
                            const value = input.value.trim();
                            if (value && !form.getValues("customTags").includes(value)) {
                              form.setValue("customTags", [...form.getValues("customTags"), value]);
                              input.value = "";
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                )}
                <div>
                  <Label>Allergens</Label>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    {(Object.keys(form.getValues().allergens) as Array<keyof InsertMenuItem['allergens']>).map((key) => (
                      <div key={key} className="flex items-center space-x-2">
                        <Checkbox                          id={key}
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
                  {editingItem ? 'Update Item' : 'Add Item'}
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
                      <TableHead>Course Type</TableHead>
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
                    <li>Course Type must be one of: {courseTypes.join(", ")}</li>
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

          <div className="space-y-8">
            {Object.entries(groupedMenuItems).map(([courseType, items]) => (
              <div key={courseType}>
                <h2 className="text-2xl font-semibold mb-4 text-primary">{courseType}</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  {items.map((item) => (
                    <Card
                      key={item.id}
                      className={`relative ${
                        selectedItems.includes(item.id) ? "ring-2 ring-primary" : ""
                      }`}
                      onClick={(e) => {
                        if (!(e.target as HTMLElement).closest('[data-dropdown-trigger="true"]')) {
                          toggleItemSelection(item.id);
                        }
                      }}
                    >
                      <CardContent className="p-6">
                        {item.image && (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-48 object-cover rounded-lg mb-4"
                          />
                        )}
                        <div className="absolute top-4 right-4 z-10">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                data-dropdown-trigger="true"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-4 w-4" />
                                <span className="sr-only">Open menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingItem(item);
                                }}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteMutation.mutate([item.id]);
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <h3 className="text-xl font-semibold mb-2">{item.name}</h3>
                        <p className="text-muted-foreground mb-4">{item.description}</p>
                        <div className="flex justify-between items-center">
                          <span className="font-semibold">${parseFloat(item.price).toFixed(2)}</span>
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
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}