import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { courseTypes, type MenuItem, type InsertMenuItem, insertMenuItemSchema, type Restaurant } from "@shared/schema";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, PlusCircle, Download, Trash2, Pencil, MoreVertical } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

type AllergenInfo = {
  milk: boolean;
  eggs: boolean;
  peanuts: boolean;
  nuts: boolean;
  shellfish: boolean;
  fish: boolean;
  soy: boolean;
  gluten: boolean;
};

export default function MenuPage() {
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<MenuItem | null>(null);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [location] = useLocation();
  const { toast } = useToast();
  const restaurantId = new URLSearchParams(location.split('?')[1]).get('restaurantId');

  const { data: restaurant } = useQuery<Restaurant>({
    queryKey: ["/api/restaurants", restaurantId],
    enabled: !!restaurantId,
  });

  const { data: menuItems, isLoading } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu-items", restaurantId],
    enabled: !!restaurantId
  });

  const form = useForm<InsertMenuItem>({
    resolver: zodResolver(insertMenuItemSchema),
    defaultValues: {
      name: "",
      description: "",
      price: "",
      courseType: "Appetizers",
      customTags: [],
      restaurantId: parseInt(restaurantId || "0"),
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
    if (editItem) {
      form.reset({
        ...editItem,
        price: editItem.price.toString(),
        image: editItem.image || undefined,
      });
      setOpen(true);
    }
  }, [editItem, form]);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const formattedData = {
        ...data,
        restaurantId: parseInt(restaurantId || "0"),
        price: data.price.replace(/^\$/, ''),
        image: data.image || '',
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
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: InsertMenuItem & { id: number }) => {
      const { id, ...updateData } = data;
      const formattedData = {
        ...updateData,
        restaurantId: parseInt(restaurantId || "0"),
        price: updateData.price.replace(/^\$/, ''),
        image: updateData.image || '',
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

  const handleExportCSV = async () => {
    if (!restaurantId) return;

    try {
      const response = await fetch(`/api/restaurants/${restaurantId}/menu/export`);
      if (!response.ok) throw new Error('Failed to export menu');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${restaurant?.name.toLowerCase().replace(/[^a-z0-9]/gi, '_')}_menu.csv`;
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

  const handleSubmit = (data: InsertMenuItem) => {
    if (editItem) {
      updateMutation.mutate({ ...data, id: editItem.id });
    } else {
      createMutation.mutate(data);
    }
  };

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
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold">Menu Items</h1>
            <div className="flex gap-2">
              <Dialog open={open} onOpenChange={(isOpen) => {
                setOpen(isOpen);
                if (!isOpen) {
                  setEditItem(null);
                  form.reset();
                }
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Item
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{editItem ? "Edit Menu Item" : "Add Menu Item"}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="name">Name</Label>
                          <Input id="name" {...form.register("name")} />
                          {form.formState.errors.name && (
                            <p className="text-sm text-destructive mt-1">
                              {form.formState.errors.name.message}
                            </p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="description">Description</Label>
                          <Textarea id="description" {...form.register("description")} />
                          {form.formState.errors.description && (
                            <p className="text-sm text-destructive mt-1">
                              {form.formState.errors.description.message}
                            </p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="price">Price</Label>
                          <Input id="price" {...form.register("price")} />
                          {form.formState.errors.price && (
                            <p className="text-sm text-destructive mt-1">
                              {form.formState.errors.price.message}
                            </p>
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
                          <Label htmlFor="image">Image</Label>
                          <Input
                            id="image"
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                          />
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
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {menuItems?.map((item) => (
            <Card
              key={item.id}
              className={`relative ${
                selectedItems.includes(item.id) ? "ring-2 ring-primary" : ""
              }`}
              onClick={(e) => {
                // Only toggle selection if we didn't click the dropdown menu
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
                          setEditItem(item);
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

                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-48 object-cover rounded-md mb-4"
                  />
                ) : (
                  <div className="w-full h-48 bg-gray-100 rounded-md mb-4 flex items-center justify-center">
                    <span className="text-gray-400">No image</span>
                  </div>
                )}
                <h3 className="text-xl font-semibold mb-2">{item.name}</h3>
                <p className="text-muted-foreground mb-4">{item.description}</p>
                <div className="flex justify-between items-center">
                  <span className="font-semibold">${parseFloat(item.price).toFixed(2)}</span>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{item.courseType}</Badge>
                    {item.customTags?.map((tag, index) => (
                      <Badge key={index} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                    {Object.entries(item.allergens)
                      .filter(([_, value]) => value)
                      .map(([key]) => (
                        <Badge
                          key={key}
                          variant="default"
                          className="bg-primary/10 text-primary hover:bg-primary/20"
                        >
                          {key}
                        </Badge>
                      ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}