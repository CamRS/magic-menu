import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Store } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Restaurant } from "@shared/schema";
import { useState } from "react";

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);

  const { data: restaurants } = useQuery<Restaurant[]>({
    queryKey: ["/api/restaurants"],
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
                {restaurants && restaurants.length > 1 ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="font-bold text-xl">
                        {selectedRestaurant?.name || "Select Restaurant"}
                        <ChevronDown className="ml-2 h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-[200px]">
                      {restaurants.map((restaurant) => (
                        <DropdownMenuItem
                          key={restaurant.id}
                          onClick={() => setSelectedRestaurant(restaurant)}
                        >
                          {restaurant.name}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuItem
                        className="text-primary font-medium"
                        onClick={() => {
                          // Navigate to bulk update page
                          window.location.href = `/menu?bulk=true`;
                        }}
                      >
                        Update All Restaurants
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  selectedRestaurant?.name
                )}
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