import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
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
import { ChevronDown, Store, PlusCircle } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Restaurant, insertRestaurantSchema } from "@shared/schema";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [isCreateOpen, setCreateOpen] = useState(false);

  const { data: restaurants } = useQuery<Restaurant[]>({
    queryKey: ["/api/restaurants"],
  });

  const form = useForm({
    resolver: zodResolver(insertRestaurantSchema),
    defaultValues: {
      name: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string }) => {
      const res = await apiRequest("POST", "/api/restaurants", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants"] });
      setCreateOpen(false);
      form.reset();
    },
  });

  // Select first restaurant by default
  if (!selectedRestaurant && restaurants && restaurants.length > 0) {
    setSelectedRestaurant(restaurants[0]);
  }

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
                    {restaurants && restaurants.length > 1 && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-primary font-medium"
                          onClick={() => {
                            window.location.href = `/menu?bulk=true`;
                          }}
                        >
                          Update All Restaurants
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <Dialog open={isCreateOpen} onOpenChange={setCreateOpen}>
                      <DialogTrigger asChild>
                        <DropdownMenuItem
                          onSelect={(e) => e.preventDefault()}
                          className="gap-2"
                        >
                          <PlusCircle className="h-4 w-4" />
                          Add New Restaurant
                        </DropdownMenuItem>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add New Restaurant</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))}>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="name">Restaurant Name</Label>
                              <Input id="name" {...form.register("name")} />
                            </div>
                            <Button type="submit" className="w-full">
                              Add Restaurant
                            </Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </DropdownMenuContent>
                </DropdownMenu>
              </h1>
              <p className="text-muted-foreground">Welcome back!</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => logoutMutation.mutate()}>
            Logout
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Link href={`/menu?restaurantId=${selectedRestaurant?.id}`}>
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl">Menu Management</CardTitle>
              </CardHeader>
              <CardContent>
                <img 
                  src="https://images.unsplash.com/photo-1556742205-e10c9486e506"
                  alt="Menu items"
                  className="w-full h-48 object-cover rounded-md mb-4"
                />
                <p className="text-muted-foreground">
                  Add, edit, and organize your menu items. Set dietary restrictions and manage allergen information.
                </p>
              </CardContent>
            </Card>
          </Link>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">QR Code Menu</CardTitle>
            </CardHeader>
            <CardContent>
              <img 
                src="https://images.unsplash.com/photo-1494346480775-936a9f0d0877"
                alt="Restaurant dining"
                className="w-full h-48 object-cover rounded-md mb-4"
              />
              <p className="text-muted-foreground">
                Generate QR codes for your menu that customers can scan to view your mobile-optimized menu.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}