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
import { Store, PlusCircle, ChevronDown, Loader2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Restaurant, MenuItem, insertMenuItemSchema, type InsertMenuItem, insertRestaurantSchema } from "@shared/schema";
import { useState, useEffect } from "react";
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
  const [isCreateRestaurantOpen, setCreateRestaurantOpen] = useState(false);

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

  const form = useForm<InsertMenuItem>({
    resolver: zodResolver(insertMenuItemSchema),
    defaultValues: {
      name: "",
      description: "",
      price: "",
      category: "",
      restaurantId: 0,
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

  useEffect(() => {
    if (!selectedRestaurant && restaurants?.length) {
      setSelectedRestaurant(restaurants[0]);
    }
  }, [restaurants, selectedRestaurant]);

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
            <Button onClick={() => setCreateMenuItemOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Menu Item
            </Button>
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

        <Dialog open={isCreateMenuItemOpen} onOpenChange={setCreateMenuItemOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Menu Item</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
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
                <Label htmlFor="category">Category</Label>
                <Input {...form.register("category")} />
                {form.formState.errors.category && (
                  <p className="text-sm text-destructive mt-1">{form.formState.errors.category.message}</p>
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
          ) : menuItems?.length === 0 ? (
            <div className="col-span-2 text-center text-muted-foreground">
              No menu items yet. Add your first item!
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