import { useQuery, useMutation } from "@tanstack/react-query";
import { MenuItem, insertMenuItemSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, PlusCircle, Download } from "lucide-react";
import { useState } from "react";
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
  const [location] = useLocation();
  const restaurantId = new URLSearchParams(location.split('?')[1]).get('restaurantId');

  const { data: menuItems, isLoading } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu-items", restaurantId],
    enabled: !!restaurantId
  });

  const form = useForm({
    resolver: zodResolver(insertMenuItemSchema),
    defaultValues: {
      name: "",
      description: "",
      price: "",
      category: "",
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

  const restaurants = [{id:1, name: "Test Restaurant"}]; // Placeholder data - replace with actual restaurant data

  const handleExportCSV = async () => {
    if (!restaurantId) return;

    try {
      const response = await fetch(`/api/restaurants/${restaurantId}/menu/export`);
      if (!response.ok) throw new Error('Failed to export menu');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${restaurants?.find(r => r.id === parseInt(restaurantId))?.name.toLowerCase().replace(/[^a-z0-9]/gi, '_')}_menu.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      useToast({
        title: "Error",
        description: "Failed to export menu",
        variant: "destructive",
      });
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

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold">Menu Items</h1>
            <div className="flex gap-2">
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Item
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Add Menu Item</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-6">
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
                          <Label htmlFor="category">Category</Label>
                          <Input id="category" {...form.register("category")} />
                          {form.formState.errors.category && (
                            <p className="text-sm text-destructive mt-1">
                              {form.formState.errors.category.message}
                            </p>
                          )}
                        </div>
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
                      disabled={createMutation.isPending}
                    >
                      {createMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Add Item
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
              <Button variant="outline" onClick={handleExportCSV}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {menuItems?.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-6">
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
    </div>
  );
}