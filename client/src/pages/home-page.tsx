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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Store, PlusCircle, Loader2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Restaurant, MenuItem } from "@shared/schema";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [isCreateMenuItemOpen, setCreateMenuItemOpen] = useState(false);

  const { data: restaurants } = useQuery<Restaurant[]>({
    queryKey: ["/api/restaurants"],
  });

  const { data: menuItems, isLoading: isLoadingMenuItems } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu-items", selectedRestaurant?.id],
    enabled: !!selectedRestaurant?.id
  });

  const form = useForm({
    defaultValues: {
      name: "",
      description: "",
      price: "",
      category: "",
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
    mutationFn: async (formData: any) => {
      if (!selectedRestaurant?.id) {
        throw new Error("No restaurant selected");
      }

      const response = await apiRequest("POST", "/api/menu-items", {
        ...formData,
        restaurantId: selectedRestaurant.id,
      });

      if (!response.ok) {
        throw new Error("Failed to create menu item");
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
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create menu item",
        variant: "destructive",
      });
    },
  });

  const handleAllergenChange = (key: string, checked: boolean) => {
    form.setValue(`allergens.${key}`, checked);
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
                  <Button variant="ghost" className="font-bold text-xl">
                    {selectedRestaurant?.name || restaurants[0].name}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {restaurants?.map((restaurant) => (
                    <DropdownMenuItem
                      key={restaurant.id}
                      onClick={() => setSelectedRestaurant(restaurant)}
                    >
                      {restaurant.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </h1>
            <Button onClick={() => setCreateMenuItemOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Menu Item
            </Button>
          </div>
          <Button variant="outline" onClick={() => logoutMutation.mutate()}>
            Logout
          </Button>
        </div>

        <Dialog open={isCreateMenuItemOpen} onOpenChange={setCreateMenuItemOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Menu Item</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input {...form.register("name")} />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea {...form.register("description")} />
                </div>
                <div>
                  <Label htmlFor="price">Price</Label>
                  <Input {...form.register("price")} />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Input {...form.register("category")} />
                </div>
                <div>
                  <Label>Allergens</Label>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    {Object.keys(form.getValues().allergens).map((key) => (
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
                className="w-full mt-6"
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

        <div className="grid md:grid-cols-2 gap-6">
          {isLoadingMenuItems ? (
            <div className="col-span-2 flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            menuItems?.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-6">
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