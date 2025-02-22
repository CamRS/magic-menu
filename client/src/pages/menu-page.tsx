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
import { courseTypes, type MenuItem, type InsertMenuItem, insertMenuItemSchema } from "@shared/schema";
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
import { Loader2, PlusCircle, Download, Upload, Trash2, Pencil, MoreVertical } from "lucide-react";
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
  const [selectedCourse, setSelectedCourse] = useState("All Courses");
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
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
        courseType: editItem.courseType as "Appetizers" | "Mains" | "Desserts" | "Alcoholic" | "Non-Alcoholic" | "Custom",
        customTags: editItem.customTags || [],
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

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !restaurantId) return;

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const csvData = event.target?.result;

          const response = await fetch(`/api/restaurants/${restaurantId}/menu/import`, {
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

          toast({
            title: "Import Complete",
            description: `Successfully imported ${result.success} items. ${
              result.failed > 0 ? `Failed to import ${result.failed} items.` : ''
            }`,
            variant: result.failed > 0 ? "destructive" : "default",
          });

          queryClient.invalidateQueries({ queryKey: ["/api/menu-items", restaurantId] });
        } catch (error) {
          console.error('Error importing CSV:', error);
          toast({
            title: "Error",
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

  const filteredMenuItems = menuItems?.filter(item => {
    const matchesCourse = selectedCourse === "All Courses" || item.courseType === selectedCourse;
    const matchesAllergens = selectedAllergens.length === 0 || 
      !selectedAllergens.some(allergen => item.allergens[allergen as keyof AllergenInfo]);
    return matchesCourse && matchesAllergens;
  });

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
    <div className="min-h-screen bg-[#121212] p-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <div className="flex flex-col gap-6">
            <Input
              type="search"
              placeholder="Search menu"
              className="bg-[#1E1E1E] border-none text-white placeholder:text-gray-400"
            />

            <div>
              <p className="text-white mb-2">I'm allergic to</p>
              <div className="flex flex-wrap gap-2">
                {Object.keys(form.getValues().allergens).map((allergen) => (
                  <Button
                    key={allergen}
                    variant={selectedAllergens.includes(allergen) ? "default" : "outline"}
                    className={`rounded-full ${
                      selectedAllergens.includes(allergen)
                        ? "bg-blue-600 text-white"
                        : "bg-[#1E1E1E] text-white hover:bg-[#2E2E2E]"
                    }`}
                    onClick={() => {
                      setSelectedAllergens(prev =>
                        prev.includes(allergen)
                          ? prev.filter(a => a !== allergen)
                          : [...prev, allergen]
                      );
                    }}
                  >
                    {allergen}
                  </Button>
                ))}
              </div>
            </div>

            <Select
              value={selectedCourse}
              onValueChange={setSelectedCourse}
            >
              <SelectTrigger className="bg-[#1E1E1E] border-none text-white w-full">
                <SelectValue placeholder="All Courses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Courses">All Courses</SelectItem>
                {courseTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-4">
          {filteredMenuItems?.map((item) => (
            <Card
              key={item.id}
              className="bg-[#1E1E1E]/80 border-none text-white overflow-hidden"
            >
              <CardContent className="p-4">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-48 object-cover rounded-lg mb-4"
                  />
                ) : null}
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <h3 className="text-xl font-bold">{item.name}</h3>
                    <span className="text-lg font-semibold text-white">${parseFloat(item.price).toFixed(2)}</span>
                  </div>
                  <p className="text-gray-300">{item.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(item.allergens)
                      .filter(([_, value]) => value)
                      .map(([key]) => (
                        <Badge
                          key={key}
                          variant="outline"
                          className="bg-transparent border-gray-600 text-gray-300"
                        >
                          Contains {key}
                        </Badge>
                      ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-white">Menu Items</h1>
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
                    <PlusCircle className="mr-2 h-4 w-4 text-white" />
                    Add Item
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl bg-gray-700 text-white">
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
                            <p className="text-sm text-red-500 mt-1">
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
                                    className="h-3 w-3 cursor-pointer text-white"
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
                        <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />
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
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleExportCSV}>
                  <Download className="mr-2 h-4 w-4 text-white" />
                  Export CSV
                </Button>
                <Button variant="outline" className="relative">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleImportCSV}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Upload className="mr-2 h-4 w-4 text-white" />
                  Import CSV
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {filteredMenuItems?.map((item) => (
            <Card
              key={item.id}
              className="bg-[#1E1E1E]/80 border-none text-white overflow-hidden"
            >
              <CardContent className="p-4">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-48 object-cover rounded-lg mb-4"
                  />
                ) : null}
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <h3 className="text-xl font-bold">{item.name}</h3>
                    <span className="text-lg font-semibold text-white">${parseFloat(item.price).toFixed(2)}</span>
                  </div>
                  <p className="text-gray-300">{item.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(item.allergens)
                      .filter(([_, value]) => value)
                      .map(([key]) => (
                        <Badge
                          key={key}
                          variant="outline"
                          className="bg-transparent border-gray-600 text-gray-300"
                        >
                          Contains {key}
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