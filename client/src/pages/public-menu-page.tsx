import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { type MenuItem, type Restaurant } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function PublicMenuPage() {
  const [matches, params] = useRoute("/menu/:restaurantId");
  const restaurantId = params?.restaurantId;

  console.log("Public Menu - Route matches:", matches);
  console.log("Public Menu - Restaurant ID:", restaurantId);

  const { data: restaurant, isLoading: isLoadingRestaurant } = useQuery<Restaurant>({
    queryKey: ["/api/restaurants", restaurantId],
    queryFn: async () => {
      const response = await fetch(`/api/restaurants/${restaurantId}`);
      if (!response.ok) throw new Error('Failed to fetch restaurant');
      return response.json();
    },
    enabled: !!restaurantId,
  });

  const { data: menuItems, isLoading: isLoadingMenu } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu-items", restaurantId],
    queryFn: async () => {
      const response = await fetch(`/api/menu-items?restaurantId=${restaurantId}`);
      if (!response.ok) throw new Error('Failed to fetch menu items');
      return response.json();
    },
    enabled: !!restaurantId,
  });

  console.log("Public Menu - Restaurant data:", restaurant);
  console.log("Public Menu - Menu items:", menuItems);

  if (!matches || !restaurantId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Restaurant not found</p>
      </div>
    );
  }

  if (isLoadingRestaurant || isLoadingMenu) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Restaurant not found</p>
      </div>
    );
  }

  const groupedMenuItems = menuItems?.reduce((groups, item) => {
    const group = item.courseType;
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(item);
    return groups;
  }, {} as Record<string, MenuItem[]>) || {};

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">
          {restaurant?.name}
        </h1>

        {Object.keys(groupedMenuItems).length === 0 ? (
          <div className="text-center text-muted-foreground">
            No menu items available
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedMenuItems).map(([courseType, items]) => (
              <div key={courseType}>
                <h2 className="text-2xl font-semibold mb-4 text-primary">{courseType}</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  {items.map((item) => (
                    <Card key={item.id}>
                      <CardContent className="p-6">
                        {item.image && (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-48 object-cover rounded-md mb-4"
                          />
                        )}
                        <h3 className="text-xl font-semibold mb-2">{item.name}</h3>
                        <p className="text-muted-foreground mb-4">{item.description}</p>
                        <div className="flex justify-between items-center">
                          <span className="font-semibold">${parseFloat(item.price).toFixed(2)}</span>
                          <div className="flex flex-wrap gap-2">
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}