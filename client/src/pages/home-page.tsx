import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Store, PlusCircle, Loader2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Restaurant, MenuItem, insertRestaurantSchema, insertMenuItemSchema } from "@shared/schema";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

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

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [isCreateRestaurantOpen, setCreateRestaurantOpen] = useState(false);
  const [isCreateMenuItemOpen, setCreateMenuItemOpen] = useState(false);

  const { data: restaurants } = useQuery<Restaurant[]>({
    queryKey: ["/api/restaurants"],
  });

  const { data: menuItems, isLoading: isLoadingMenuItems } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu-items", selectedRestaurant?.id],
    enabled: !!selectedRestaurant?.id
  });

  const restaurantForm = useForm({
    resolver: zodResolver(insertRestaurantSchema),
    defaultValues: {
      name: "",
      userId: user?.id,
    },
  });

  const menuItemForm = useForm({
    resolver: zodResolver(insertMenuItemSchema),
    defaultValues: {
      name: "",
      description: "",
      price: "",
      category: "",
      restaurantId: selectedRestaurant?.id || 0,
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

  const createRestaurantMutation = useMutation({
    mutationFn: async (data: { name: string }) => {
      const response = await apiRequest("POST", "/api/restaurants", {
        ...data,
        userId: user?.id,
      });
      if (!response.ok) {
        throw new Error("Failed to create restaurant");
      }
      return response.json();
    },
    onSuccess: (newRestaurant) => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants"] });
      setSelectedRestaurant(newRestaurant);
      setCreateRestaurantOpen(false);
      restaurantForm.reset();
    },
  });

  const createMenuItemMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/menu-items", {
        ...data,
        restaurantId: selectedRestaurant?.id
      });
      if (!res.ok) {
        throw new Error("Failed to create menu item");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items", selectedRestaurant?.id] });
      setCreateMenuItemOpen(false);
      menuItemForm.reset();
    },
  });

  // Select first restaurant by default
  if (!selectedRestaurant && restaurants && restaurants.length > 0) {
    setSelectedRestaurant(restaurants[0]);
  }

  const handleAllergenChange = (key: keyof AllergenInfo, checked: boolean) => {
    menuItemForm.setValue(`allergens.${key}`, checked, { shouldValidate: true });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        menuItemForm.setValue("image", reader.result as string, { shouldValidate: true });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Store className="h-8 w-8" />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="font-bold text-xl">
                      {selectedRestaurant?.name || "Select Restaurant"}
                      <ChevronDown className="ml-2 h-4 w-4" />
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
                    <Button
                      variant="ghost"
                      className="w-full justify-start px-2 gap-2"
                      onClick={() => setCreateRestaurantOpen(true)}
                    >
                      <PlusCircle className="h-4 w-4" />
                      Add New Restaurant
                    </Button>
                  </DropdownMenuContent>
                </DropdownMenu>
              </h1>
              <p className="text-muted-foreground">Welcome back!</p>
            </div>
            {selectedRestaurant && (
              <Button onClick={() => setCreateMenuItemOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Menu Item
              </Button>
            )}
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
            <form 
              onSubmit={restaurantForm.handleSubmit((data) => createRestaurantMutation.mutate(data))}
              className="space-y-4"
            >
              <div>
                <Label htmlFor="name">Restaurant Name</Label>
                <Input id="name" {...restaurantForm.register("name")} />
                {restaurantForm.formState.errors.name && (
                  <p className="text-sm text-destructive mt-1">
                    {restaurantForm.formState.errors.name.message}
                  </p>
                )}
              </div>
              <Button 
                type="submit" 
                className="w-full"
                disabled={createRestaurantMutation.isPending}
              >
                {createRestaurantMutation.isPending ? "Creating..." : "Add Restaurant"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isCreateMenuItemOpen} onOpenChange={setCreateMenuItemOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Menu Item</DialogTitle>
            </DialogHeader>
            <form onSubmit={menuItemForm.handleSubmit((data) => createMenuItemMutation.mutate(data))} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" {...menuItemForm.register("name")} />
                    {menuItemForm.formState.errors.name && (
                      <p className="text-sm text-destructive mt-1">
                        {menuItemForm.formState.errors.name.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" {...menuItemForm.register("description")} />
                    {menuItemForm.formState.errors.description && (
                      <p className="text-sm text-destructive mt-1">
                        {menuItemForm.formState.errors.description.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="price">Price</Label>
                    <Input id="price" {...menuItemForm.register("price")} />
                    {menuItemForm.formState.errors.price && (
                      <p className="text-sm text-destructive mt-1">
                        {menuItemForm.formState.errors.price.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Input id="category" {...menuItemForm.register("category")} />
                    {menuItemForm.formState.errors.category && (
                      <p className="text-sm text-destructive mt-1">
                        {menuItemForm.formState.errors.category.message}
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
                    {(Object.keys(menuItemForm.getValues().allergens) as Array<keyof AllergenInfo>).map((key) => (
                      <div key={key} className="flex items-center space-x-2">
                        <Checkbox
                          id={key}
                          checked={menuItemForm.getValues().allergens[key]}
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
                disabled={createMenuItemMutation.isPending}
              >
                {createMenuItemMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Add Item
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {selectedRestaurant && (
          <div className="grid md:grid-cols-2 gap-6">
            {isLoadingMenuItems ? (
              <div className="col-span-2 flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              menuItems?.map((item) => (
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
                      <span className="font-semibold">${item.price}</span>
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
        )}
      </div>
    </div>
  );
}