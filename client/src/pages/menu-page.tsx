import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Share2, Download, Upload, Filter, Settings, Maximize2, 
  ChevronRight, Search, Eye, EyeOff, Trash2, Pencil, X 
} from "lucide-react";
import { type MenuItem, type InsertMenuItem, insertMenuItemSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

// ... (keep existing type definitions)

export default function MenuPage() {
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<MenuItem | null>(null);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [newTag, setNewTag] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showLabels, setShowLabels] = useState(false);
  const [statusFilter, setStatusFilter] = useState<MenuItemStatus | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);

  const form = useForm<InsertMenuItem>({
    resolver: zodResolver(insertMenuItemSchema),
    defaultValues: {
      name: "",
      description: "",
      price: "",
      courseTags: [],
      restaurantId: parseInt(restaurantId || "0"),
      image: "",
      status: "draft" as MenuItemStatus,
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

  const { data: menuItems, isLoading } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu-items", restaurantId, statusFilter, searchTerm], 
    queryFn: async () => {
      let url = `/api/menu-items?restaurantId=${restaurantId}${statusFilter ? `&status=${statusFilter}` : ''}`;
      if (searchTerm) {
        url += `&search=${searchTerm}`;
      }
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch menu items');
      return response.json();
    },
    enabled: !!restaurantId
  });

  useEffect(() => {
    if (editItem) {
      const formData = {
        name: editItem.name,
        description: editItem.description,
        price: editItem.price ? parseFloat(editItem.price).toFixed(2) : '',
        courseTags: editItem.courseTags || [],
        restaurantId: editItem.restaurantId,
        image: editItem.image || "",
        status: editItem.status as MenuItemStatus,
        allergens: editItem.allergens || {
          milk: false,
          eggs: false,
          peanuts: false,
          nuts: false,
          shellfish: false,
          fish: false,
          soy: false,
          gluten: false,
        },
      };
      form.reset(formData);
    }
  }, [editItem, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: InsertMenuItem & { id: number }) => {
      const { id, ...updateData } = data;
      const formattedData = {
        ...updateData,
        restaurantId: parseInt(restaurantId || "0"),
        price: updateData.price.toString().replace(/^\$/, ''),
        image: updateData.image || '',
        courseTags: updateData.courseTags || [],
      };

      const res = await apiRequest("PATCH", `/api/menu-items/${id}`, formattedData);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update menu item");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items", restaurantId] });
      setOpen(false);
      setEditItem(null);
      form.reset();
      toast({
        title: "Success",
        description: "Menu item updated successfully",
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
      const formattedData = {
        ...data,
        restaurantId: parseInt(restaurantId || "0"),
        price: data.price.replace(/^\$/, ''),
        image: data.image || '',
        courseTags: data.courseTags || [],
        status: "draft" as MenuItemStatus,
      };

      const res = await apiRequest("POST", "/api/menu-items", formattedData);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create menu item");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items", restaurantId] });
      setOpen(false);
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
    try {
      const formattedData = {
        ...data,
        price: data.price.replace(/[^\d.-]/g, '').length > 0 ? parseFloat(data.price.replace(/[^\d.-]/g, '')).toFixed(2) : '',
      };

      if (editItem) {
        await updateMutation.mutateAsync({
          ...formattedData,
          id: editItem.id,
          restaurantId: parseInt(restaurantId || "0"),
        });
      } else {
        await createMutation.mutateAsync(formattedData);
      }
    } catch (error) {
      console.error('Form submission error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save menu item",
        variant: "destructive",
      });
    }
  };

  const handleAllergenChange = (key: keyof AllergenInfo, checked: boolean) => {
    form.setValue(`allergens.${key}`, checked, { shouldValidate: true });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        form.setValue("image", reader.result as string, { shouldValidate: true });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExportCSV = async () => {
    if (!restaurantId) return;
    try {
      const response = await fetch(`/api/restaurants/${restaurantId}/menu/export`);
      if (!response.ok) throw new Error('Failed to export menu');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'menu.csv';
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
    const file = e.target.files?.[0];
    if (!file || !restaurantId) return;

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/restaurants/${restaurantId}/menu/import`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to import menu items');
      }

      queryClient.invalidateQueries({ queryKey: ["/api/menu-items", restaurantId] });
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

  const toggleItemSelection = (id: number) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
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
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items", restaurantId] });
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

  const handleDeleteSelected = () => {
    if (selectedItems.length === 0) return;
    deleteMutation.mutate(selectedItems);
  };

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: MenuItemStatus }) => {
      const res = await apiRequest("PATCH", `/api/menu-items/${id}/status`, { status });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update menu item status");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items", restaurantId] });
      toast({
        title: "Success",
        description: "Menu item status updated successfully",
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

  const toggleItemStatus = async (item: MenuItem) => {
    const newStatus: MenuItemStatus = item.status === "draft" ? "live" : "draft";
    await updateStatusMutation.mutateAsync({ id: item.id, status: newStatus });
  };

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

  const locationData = useLocation();
  const restaurantId = new URLSearchParams(locationData.split('?')[1]).get('restaurantId');


  if (!restaurantId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Please select a restaurant first</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-custom-gray-100" 
      style={backgroundImage ? {
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      } : {}}
    >
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-custom-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Left Section */}
            <div className="flex items-center space-x-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full"
                      onClick={() => setShowLabels(!showLabels)}
                    >
                      <ChevronRight className={`h-5 w-5 transition-transform ${showLabels ? 'rotate-180' : ''}`} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Toggle Labels</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Center Icons */}
            <div className="flex items-center space-x-4">
              <TooltipProvider>
                {[
                  { icon: Share2, label: "Share Menu" },
                  { icon: Download, label: "Export CSV", onClick: handleExportCSV },
                  { 
                    icon: Upload, 
                    label: "Import CSV",
                    input: {
                      type: "file",
                      accept: ".csv",
                      onChange: handleImportCSV,
                    }
                  },
                  { icon: Filter, label: "Filter Menu" }
                ].map(({ icon: Icon, label, onClick, input }) => (
                  <Tooltip key={label}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="relative rounded-full"
                        onClick={onClick}
                      >
                        {input && (
                          <input
                            {...input}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                        )}
                        <Icon className="h-5 w-5" />
                        {showLabels && (
                          <span className="ml-2 text-sm">{label}</span>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{label}</TooltipContent>
                  </Tooltip>
                ))}
              </TooltipProvider>
            </div>

            {/* Right Icons */}
            <div className="flex items-center space-x-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full"
                      onClick={() => setSettingsOpen(true)}
                    >
                      <Settings className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Settings</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full"
                    >
                      <Maximize2 className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Fullscreen</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-custom-gray-400" />
          <Input
            placeholder="Search the menu"
            className="pl-12 h-12 rounded-3xl border-custom-gray-200 bg-white shadow-sm w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-3 mb-6">
          <Button
            variant={statusFilter === null ? "default" : "outline"}
            className={`filter-tab ${statusFilter === null ? 'filter-tab-active' : 'filter-tab-inactive'}`}
            onClick={() => setStatusFilter(null)}
          >
            All Items
          </Button>
          <Button
            variant={statusFilter === "draft" ? "default" : "outline"}
            className={`filter-tab ${statusFilter === "draft" ? 'filter-tab-active' : 'filter-tab-inactive'}`}
            onClick={() => setStatusFilter("draft")}
          >
            Drafts
          </Button>
          <Button
            variant={statusFilter === "live" ? "default" : "outline"}
            className={`filter-tab ${statusFilter === "live" ? 'filter-tab-active' : 'filter-tab-inactive'}`}
            onClick={() => setStatusFilter("live")}
          >
            Live
          </Button>

          {/* Add Item Button */}
          <Dialog 
            open={open} 
            onOpenChange={(isOpen) => {
              setOpen(isOpen);
              if (!isOpen) {
                setEditItem(null);
                form.reset();
              }
            }}
          >
            <DialogTrigger asChild>
              <Button className="filter-tab filter-tab-active ml-auto">
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-gray-700 text-white">
              <DialogHeader>
                <DialogTitle>{editItem ? "Edit Menu Item" : "Add Menu Item"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" {...form.register("name")} />
                      {form.formState.errors.name && (
                        <p className="text-sm text-red-500 mt-1">
                          {form.formState.errors.name.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea id="description" {...form.register("description")} />
                      {form.formState.errors.description && (
                        <p className="text-sm text-red-500 mt-1">
                          {form.formState.errors.description.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="price">Price</Label>
                      <Input id="price" {...form.register("price")} />
                      {form.formState.errors.price && (
                        <p className="text-sm text-red-500 mt-1">
                          {form.formState.errors.price.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label>Course Tags</Label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {form.watch("courseTags").map((tag, index) => (
                          <Badge key={index} variant="secondary" className="flex items-center gap-1">
                            {tag}
                            <X
                              className="h-3 w-3 cursor-pointer text-white"
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
                          Add
                        </Button>
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
                  </div>
                  <div>
                    <Label>Allergens</Label>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      {(Object.keys(form.getValues().allergens) as Array<keyof AllergenInfo>).map((key) => (
                        <div key={key} className="flex items-center space-x-2">
                          <Checkbox
                            id={key}
                            checked={form.getValues().allergens[key]}
                            onCheckedChange={(checked) => handleAllergenChange(key, checked as boolean)}
                          />
                          <Label htmlFor={key} className="capitalize">
                            {key}
                          </Label>
                        </div>
                      ))}
                    </div>
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
                  {editItem ? "Update Item" : "Add Item"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Selected Items Actions */}
        {selectedItems.length > 0 && (
          <Button
            variant="destructive"
            onClick={handleDeleteSelected}
            disabled={deleteMutation.isPending}
            className="mb-6 rounded-full"
          >
            {deleteMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Delete Selected ({selectedItems.length})
          </Button>
        )}

        {/* Menu Items Grid */}
        {Object.entries(groupedItems).map(([status, items]) => (
          <div key={status} className="mb-8">
            <h2 className="text-xl font-semibold text-custom-gray-500 mb-4 capitalize">
              {status} Items ({items.length})
            </h2>
            <div className="space-y-4">
              {items.map((item) => (
                <Card key={item.id} className="menu-card">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-6">
                      <Checkbox
                        checked={selectedItems.includes(item.id)}
                        onCheckedChange={() => toggleItemSelection(item.id)}
                        className="mt-1"
                      />

                      {/* Image Section */}
                      <div className="w-32 h-32 flex-shrink-0 bg-custom-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-center text-custom-gray-400 text-sm">
                            <Upload className="h-6 w-6 mx-auto mb-1" />
                            <span>Upload Image</span>
                          </div>
                        )}
                      </div>

                      {/* Content Section */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-lg font-medium text-custom-gray-500 line-clamp-1">
                              {item.name}
                            </h3>
                            <p className="text-custom-gray-400 mt-1 line-clamp-2">
                              {item.description}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge 
                              variant={item.status === "live" ? "default" : "secondary"}
                              className="rounded-full px-3 py-1"
                            >
                              {item.status}
                            </Badge>
                            <TooltipProvider>
                              {[
                                {
                                  icon: item.status === "draft" ? Eye : EyeOff,
                                  label: item.status === "draft" ? "Make Live" : "Make Draft",
                                  onClick: () => toggleItemStatus(item)
                                },
                                {
                                  icon: Pencil,
                                  label: "Edit",
                                  onClick: () => {
                                    setEditItem(item);
                                    setOpen(true);
                                  }
                                },
                                {
                                  icon: Trash2,
                                  label: "Delete",
                                  onClick: () => deleteMutation.mutate([item.id])
                                }
                              ].map(({ icon: Icon, label, onClick }) => (
                                <Tooltip key={label}>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="rounded-full"
                                      onClick={onClick}
                                    >
                                      <Icon className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>{label}</TooltipContent>
                                </Tooltip>
                              ))}
                            </TooltipProvider>
                          </div>
                        </div>

                        <div className="flex justify-between items-center mt-4">
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(item.allergens)
                              .filter(([_, value]) => value)
                              .map(([key]) => (
                                <Badge
                                  key={key}
                                  variant="outline"
                                  className="rounded-full bg-custom-gray-100 text-custom-gray-400 border-none px-3"
                                >
                                  Contains {key}
                                </Badge>
                              ))}
                          </div>
                          <span className="text-lg font-medium text-custom-gray-500">
                            {item.price ? `$${parseFloat(item.price).toFixed(2)}` : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </main>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Background Image</Label>
              <div
                className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:border-primary transition-colors"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files[0];
                  if (file && file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setBackgroundImage(reader.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              >
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setBackgroundImage(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="hidden"
                />
                <div className="text-center">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-600">
                    Drag and drop an image here or click to select
                  </p>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}