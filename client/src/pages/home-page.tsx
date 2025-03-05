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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Copy, Store, PlusCircle, ChevronDown, Loader2, Download, Upload, Trash2, MoreVertical, Pencil, Globe, Image as ImageIcon, QrCode, Search, Eye, EyeOff, X } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { type Restaurant, type MenuItem, type InsertMenuItem, insertMenuItemSchema } from "@shared/schema";
import { useState, useRef, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { QRCodeSVG } from 'qrcode.react';

type MenuItemStatus = "draft" | "live";

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [isCreateMenuItemOpen, setCreateMenuItemOpen] = useState(false);
  const [isCreateRestaurantOpen, setCreateRestaurantOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [showQrCode, setShowQrCode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<MenuItemStatus | null>(null);
  const [newTag, setNewTag] = useState('');
  const qrCodeRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<InsertMenuItem>({
    resolver: zodResolver(insertMenuItemSchema),
    defaultValues: {
      name: "",
      description: "",
      price: "",
      courseTags: [],
      restaurantId: 0,
      image: "",
      status: "draft",
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

  const handleImageDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        form.setValue("image", reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        form.setValue("image", reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const { data: restaurants, isLoading: isLoadingRestaurants } = useQuery<Restaurant[]>({
    queryKey: ["/api/restaurants"],
    enabled: !!user?.id,
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
  });

  // Group items by status
  const groupedItems = useMemo(() => {
    if (!menuItems) return { draft: [], live: [] };
    return menuItems.reduce(
      (acc, item) => {
        acc[item.status as MenuItemStatus].push(item);
        return acc;
      },
      { draft: [], live: [] } as Record<MenuItemStatus, MenuItem[]>
    );
  }, [menuItems]);

  // Filter items based on search and status
  const filteredItems = useMemo(() => {
    let items = menuItems || [];

    if (searchTerm) {
      items = items.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter) {
      items = items.filter(item => item.status === statusFilter);
    }

    return items;
  }, [menuItems, searchTerm, statusFilter]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: MenuItemStatus }) => {
      const response = await apiRequest("PATCH", `/api/menu-items/${id}/status`, { status });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update status");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items", selectedRestaurant?.id] });
      toast({
        title: "Success",
        description: "Item status updated successfully",
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

  const createMutation = useMutation({
    mutationFn: async (data: InsertMenuItem) => {
      if (!selectedRestaurant?.id) {
        throw new Error("No restaurant selected");
      }

      const response = await apiRequest("POST", "/api/menu-items", {
        ...data,
        restaurantId: selectedRestaurant.id,
      });
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

  const handleSubmit = async (data: InsertMenuItem) => {
    if (!selectedRestaurant?.id) {
      toast({
        title: "Error",
        description: "Please select a restaurant first",
        variant: "destructive",
      });
      return;
    }

    if (editingItem) {
      const response = await apiRequest("PATCH", `/api/menu-items/${editingItem.id}`, {
        ...data,
        restaurantId: selectedRestaurant.id,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update menu item");
      }
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items", selectedRestaurant.id] });
      setCreateMenuItemOpen(false);
      setEditingItem(null);
      form.reset();
      toast({
        title: "Success",
        description: "Menu item updated successfully",
      });
    } else {
      createMutation.mutate({ ...data, restaurantId: selectedRestaurant.id });
    }
  };

  const handleStatusChange = async (item: MenuItem) => {
    const newStatus: MenuItemStatus = item.status === "draft" ? "live" : "draft";
    await updateStatusMutation.mutateAsync({ id: item.id, status: newStatus });
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    form.reset({
      name: item.name,
      description: item.description,
      price: item.price,
      courseTags: item.courseTags,
      image: item.image,
      status: item.status as MenuItemStatus,
      allergens: item.allergens,
      restaurantId: item.restaurantId,
    });
    setCreateMenuItemOpen(true);
  };

  const handleDelete = (itemId: number) => {
    deleteMutation.mutate([itemId]);
  };

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
        description: "Items deleted successfully",
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

  const toggleItemSelection = (id: number) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = () => {
    if (selectedItems.length === 0) return;
    deleteMutation.mutate(selectedItems);
  };

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
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/restaurants/${selectedRestaurant.id}/menu/import`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to import menu items');
      }

      queryClient.invalidateQueries({ queryKey: ["/api/menu-items", selectedRestaurant.id] });
      toast({
        title: "Success",
        description: "Menu items imported successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to import menu items",
        variant: "destructive",
      });
    }
  };

  const MenuItemCard = ({ item }: { item: MenuItem }) => {
    return (
      <Card className="bg-white shadow-sm">
        <CardContent className="p-4">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedItems.includes(item.id)}
                onCheckedChange={() => toggleItemSelection(item.id)}
              />
              <div>
                <h3 className="font-semibold">{item.name}</h3>
                <p className="text-sm text-gray-600">{item.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant={item.status === "live" ? "default" : "secondary"}>
                {item.status}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleStatusChange(item)}
                disabled={updateStatusMutation.isPending}
              >
                {item.status === "draft" ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEdit(item)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(item.id)}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {item.image && (
            <img
              src={item.image}
              alt={item.name}
              className="mt-4 w-full h-48 object-cover rounded-lg"
            />
          )}

          <div className="mt-4 flex justify-between items-center">
            <div className="flex flex-wrap gap-2">
              {Object.entries(item.allergens)
                .filter(([_, value]) => value)
                .map(([key]) => (
                  <Badge key={key} variant="outline" className="capitalize">
                    {key}
                  </Badge>
                ))}
            </div>
            <span className="font-semibold">
              {item.price ? `$${parseFloat(item.price).toFixed(2)}` : ''}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4">
        {/* Header with restaurant selection and actions */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">Menu Items</h1>
            {selectedRestaurant && (
              <Badge variant="outline" className="text-lg">
                {selectedRestaurant.name}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* Restaurant selector dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Store className="mr-2 h-4 w-4" />
                  Select Restaurant
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {restaurants?.map((restaurant) => (
                  <DropdownMenuItem
                    key={restaurant.id}
                    onClick={() => setSelectedRestaurant(restaurant)}
                  >
                    {restaurant.name}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setCreateRestaurantOpen(true)}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add New Restaurant
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Action buttons */}
            <Button onClick={() => setCreateMenuItemOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Item
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={handleExportCSV}>
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                  <Upload className="mr-2 h-4 w-4" />
                  Import CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowQrCode(true)}>
                  <QrCode className="mr-2 h-4 w-4" />
                  Show QR Code
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => selectedRestaurant && copyMenuUrl(selectedRestaurant.id)}
                >
                  <Globe className="mr-2 h-4 w-4" />
                  Copy Menu URL
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Search and filters */}
        <div className="mb-6">
          <div className="flex gap-4 mb-4">
            <Input
              type="search"
              placeholder="Search menu items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {/* Status filters */}
          <div className="flex gap-2">
            <Button
              variant={statusFilter === null ? "default" : "outline"}
              onClick={() => setStatusFilter(null)}
            >
              All Items
            </Button>
            <Button
              variant={statusFilter === "draft" ? "default" : "outline"}
              onClick={() => setStatusFilter("draft")}
            >
              Drafts ({groupedItems.draft?.length || 0})
            </Button>
            <Button
              variant={statusFilter === "live" ? "default" : "outline"}
              onClick={() => setStatusFilter("live")}
            >
              Live ({groupedItems.live?.length || 0})
            </Button>
          </div>
        </div>

        {/* Bulk actions */}
        {selectedItems.length > 0 && (
          <Button
            variant="destructive"
            onClick={handleDeleteSelected}
            disabled={deleteMutation.isPending}
            className="mb-4"
          >
            {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete Selected ({selectedItems.length})
          </Button>
        )}

        {/* Menu items list */}
        <div className="space-y-4">
          {filteredItems.map((item) => (
            <MenuItemCard key={item.id} item={item} />
          ))}
        </div>

        {/* Hidden file input for CSV import */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleImportCSV}
          className="hidden"
        />

        {/* Create/Edit Menu Item Dialog */}
        <Dialog 
          open={isCreateMenuItemOpen} 
          onOpenChange={(isOpen) => {
            setCreateMenuItemOpen(isOpen);
            if (!isOpen) {
              setEditingItem(null);
              form.reset();
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit Menu Item' : 'Add Menu Item'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input {...form.register("name")} />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea {...form.register("description")} />
                {form.formState.errors.description && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.description.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="price">Price</Label>
                <Input {...form.register("price")} />
                {form.formState.errors.price && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.price.message}
                  </p>
                )}
              </div>

              {/* Course Tags */}
              <div>
                <Label>Course Tags</Label>
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
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add a new tag"
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const value = newTag.trim();
                        if (value && !form.getValues("courseTags").includes(value)) {
                          form.setValue("courseTags", [...form.getValues("courseTags"), value]);
                          setNewTag("");
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      const value = newTag.trim();
                      if (value && !form.getValues("courseTags").includes(value)) {
                        form.setValue("courseTags", [...form.getValues("courseTags"), value]);
                        setNewTag("");
                      }
                    }}
                  >
                    Add Tag
                  </Button>
                </div>
              </div>

              {/* Image Upload */}
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
                    onChange={handleImageUpload}
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
              </div>

              {/* Allergens */}
              <div>
                <Label>Allergens</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  {(Object.keys(form.getValues().allergens) as Array<keyof InsertMenuItem['allergens']>).map((key) => (
                    <div key={key} className="flex items-center space-x-2">
                      <Checkbox
                        id={key}
                        checked={form.watch(`allergens.${key}`)}
                        onCheckedChange={(checked) => {
                          form.setValue(`allergens.${key}`, checked as boolean);
                        }}
                      />
                      <Label htmlFor={key} className="capitalize">
                        {key}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div>
                <Label htmlFor="status">Status</Label>
                <select {...form.register("status")} className="w-full p-2 border rounded-md">
                  <option value="draft">Draft</option>
                  <option value="live">Live</option>
                </select>
              </div>

              <Button type="submit" className="w-full">
                {editingItem ? "Update Item" : "Add Item"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* QR Code Dialog */}
        {selectedRestaurant && (
          <Dialog open={showQrCode} onOpenChange={setShowQrCode}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Menu QR Code</DialogTitle>
              </DialogHeader>
              <div ref={qrCodeRef} className="flex flex-col items-center justify-center p-4">
                <QRCodeSVG
                  value={getPublicMenuUrl(selectedRestaurant.id)}
                  size={200}
                  className="mb-4"
                />
                <p className="text-sm text-gray-500 break-all">
                  {getPublicMenuUrl(selectedRestaurant.id)}
                </p>
              </div>
              <DialogFooter>
                <Button onClick={() => setShowQrCode(false)}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}