import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Store, PlusCircle, ChevronDown, Loader2, Download, Trash2, MoreVertical, Pencil } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { type Restaurant, type MenuItem, type InsertMenuItem, insertMenuItemSchema, insertRestaurantSchema, courseTypes } from "@shared/schema";
import { useState, useEffect } from "react";
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

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [isCreateMenuItemOpen, setCreateMenuItemOpen] = useState(false);
  const [isCreateRestaurantOpen, setCreateRestaurantOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  const { data: restaurants } = useQuery<Restaurant[]>({
    queryKey: ["/api/restaurants"],
  });

  const { data: menuItems, isLoading: isLoadingMenuItems } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu-items", selectedRestaurant?.id],
    queryFn: async () => {
      if (!selectedRestaurant?.id) return [];
      const response = await apiRequest("GET", `/api/menu-items?restaurantId=${selectedRestaurant.id}`);
      if (!response.ok) throw new Error("Failed to fetch menu items");
      return response.json();
    },
    enabled: !!selectedRestaurant?.id,
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

  useEffect(() => {
    if (editingItem) {
      form.reset({
        ...editingItem,
        price: editingItem.price.toString(),
      });
      setCreateMenuItemOpen(true);
    }
  }, [editingItem, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: InsertMenuItem & { id: number }) => {
      const { id, ...updateData } = data;
      const response = await apiRequest("PATCH", `/api/menu-items/${id}`, updateData);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update menu item");
      }
      return response.json();
    },
    onSuccess: () => {
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
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: InsertMenuItem) => {
    if (editingItem) {
      updateMutation.mutate({ ...data, id: editingItem.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDialogOpenChange = (open: boolean) => {
    setCreateMenuItemOpen(open);
    if (!open) {
      setEditingItem(null);
      form.reset();
    }
  };

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

  if (!restaurants?.length) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Please create a restaurant first</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold flex items-center gap-2">
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
            </h1>
            <div className="flex gap-2">
              <Button onClick={() => setCreateMenuItemOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Menu Item
              </Button>
              {selectedItems.length > 0 && (
                <Button
                  variant="destructive"
                  onClick={handleDeleteSelected}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Delete Selected ({selectedItems.length})
                </Button>
              )}
              <Button variant="outline" onClick={handleExportCSV}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>
          <Button variant="outline" onClick={() => logoutMutation.mutate()}>
            Logout
          </Button>
        </div>

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
                            form.setValue("customTags", newTags);
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
                {editingItem ? 'Update Item' : 'Add Item'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <div className="grid md:grid-cols-2 gap-6">
          {isLoadingMenuItems ? (
            <div className="col-span-2 flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : menuItems?.length === 0 ? (
            <div className="col-span-2 text-center text-muted-foreground">
              No menu items yet. Add your first item!
            </div>
          ) : (
            menuItems?.map((item) => (
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
            ))
          )}
        </div>
      </div>
    </div>
  );
}