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
import { Loader2, PlusCircle } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

type DietaryInfo = {
  vegetarian: boolean;
  vegan: boolean;
  glutenFree: boolean;
  dairyFree: boolean;
  nutFree: boolean;
  shellfish: boolean;
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
      image: "https://images.unsplash.com/photo-1599250300435-b9693f21830d",
      dietaryInfo: {
        vegetarian: false,
        vegan: false,
        glutenFree: false,
        dairyFree: false,
        nutFree: false,
        shellfish: false,
      },
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/menu-items", {
        ...data,
        restaurantId: parseInt(restaurantId || "0")
      });
      if (!res.ok) {
        throw new Error("Failed to create menu item");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items", restaurantId] });
      setOpen(false);
      form.reset();
    },
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

  const handleDietaryChange = (key: keyof DietaryInfo, checked: boolean) => {
    form.setValue(`dietaryInfo.${key}`, checked, { shouldValidate: true });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Menu Items</h1>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Menu Item</DialogTitle>
              </DialogHeader>
              <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))}>
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
                    <Label>Dietary Information</Label>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      {(Object.keys(form.getValues().dietaryInfo) as Array<keyof DietaryInfo>).map((key) => (
                        <div key={key} className="flex items-center space-x-2">
                          <Checkbox
                            id={key}
                            checked={form.getValues().dietaryInfo[key]}
                            onCheckedChange={(checked) => handleDietaryChange(key, checked as boolean)}
                          />
                          <Label htmlFor={key}>
                            {key.replace(/([A-Z])/g, " $1").trim()}
                          </Label>
                        </div>
                      ))}
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
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {menuItems?.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-6">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-48 object-cover rounded-md mb-4"
                />
                <h3 className="text-xl font-semibold mb-2">{item.name}</h3>
                <p className="text-muted-foreground mb-4">{item.description}</p>
                <div className="flex justify-between items-center">
                  <span className="font-semibold">{item.price}</span>
                  <div className="flex gap-2">
                    {Object.entries(item.dietaryInfo)
                      .filter(([_, value]) => value)
                      .map(([key]) => (
                        <span
                          key={key}
                          className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full"
                        >
                          {key.replace(/([A-Z])/g, " $1").trim()}
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