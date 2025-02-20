import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { type MenuItem, type Restaurant, courseTypes } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useMemo } from "react";

type AllergenType = keyof MenuItem['allergens'];
const allergensList: AllergenType[] = ['milk', 'eggs', 'peanuts', 'nuts', 'shellfish', 'fish', 'soy', 'gluten'];

export default function PublicMenuPage() {
  const [matches, params] = useRoute("/menu/:restaurantId");
  const restaurantId = params?.restaurantId;
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [selectedAllergens, setSelectedAllergens] = useState<AllergenType[]>([]);

  const { data: restaurant, isLoading: isLoadingRestaurant } = useQuery<Restaurant>({
    queryKey: ["/api/restaurants", restaurantId],
    enabled: !!restaurantId
  });

  const { data: menuItems, isLoading: isLoadingMenu } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu-items", restaurantId],
    enabled: !!restaurantId
  });

  const filteredItems = useMemo(() => {
    if (!menuItems) return [];

    return menuItems.filter(item => {
      // Search filter
      const matchesSearch = searchTerm === "" || 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase());

      // Course filter
      const matchesCourse = selectedCourse === "all" || item.courseType === selectedCourse;

      // Allergen filter - exclude items that contain any selected allergen
      const matchesAllergens = selectedAllergens.length === 0 || 
        !selectedAllergens.some(allergen => item.allergens[allergen]);

      return matchesSearch && matchesCourse && matchesAllergens;
    });
  }, [menuItems, searchTerm, selectedCourse, selectedAllergens]);

  const groupedMenuItems = useMemo(() => {
    return filteredItems.reduce((groups, item) => {
      const group = item.courseType;
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(item);
      return groups;
    }, {} as Record<string, MenuItem[]>);
  }, [filteredItems]);

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

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">
          {restaurant.name}
        </h1>

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Search Bar */}
            <div className="col-span-full">
              <Label htmlFor="search">Search Menu</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name or description..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Course Type Filter */}
            <div>
              <Label>Filter by Course</Label>
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger>
                  <SelectValue placeholder="All Courses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                  {courseTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Allergen Filters */}
            <div className="col-span-2">
              <Label className="mb-2 block">Exclude Allergens</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {allergensList.map((allergen) => (
                  <div key={allergen} className="flex items-center space-x-2">
                    <Checkbox
                      id={allergen}
                      checked={selectedAllergens.includes(allergen)}
                      onCheckedChange={(checked) => {
                        setSelectedAllergens(prev => 
                          checked
                            ? [...prev, allergen]
                            : prev.filter(a => a !== allergen)
                        );
                      }}
                    />
                    <Label htmlFor={allergen} className="capitalize">
                      {allergen}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {Object.keys(groupedMenuItems).length === 0 ? (
          <div className="text-center text-muted-foreground">
            No menu items match your filters
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