import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { type MenuItem, type Restaurant, courseTypes } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, Loader2, Search } from "lucide-react";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";

type AllergenType = keyof MenuItem['allergens'];
const allergensList: AllergenType[] = ['milk', 'eggs', 'peanuts', 'nuts', 'shellfish', 'fish', 'soy', 'gluten'];

export default function PublicMenuPage() {
  const [matches, params] = useRoute("/menu/:restaurantId");
  const restaurantId = params?.restaurantId;
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [selectedAllergens, setSelectedAllergens] = useState<AllergenType[]>([]);
  const [isFiltersOpen, setIsFiltersOpen] = useState(true);

  const { data: restaurant, isLoading: isLoadingRestaurant } = useQuery<Restaurant>({
    queryKey: ["/api/restaurants", restaurantId],
    queryFn: async () => {
      const response = await fetch(`/api/restaurants/${restaurantId}`);
      if (!response.ok) throw new Error('Failed to fetch restaurant');
      return response.json();
    },
    enabled: !!restaurantId
  });

  const { data: menuItems, isLoading: isLoadingMenu } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu-items", restaurantId],
    queryFn: async () => {
      const response = await fetch(`/api/menu-items?restaurantId=${restaurantId}`);
      if (!response.ok) throw new Error('Failed to fetch menu items');
      return response.json();
    },
    enabled: !!restaurantId
  });

  const filteredItems = useMemo(() => {
    if (!menuItems) return [];

    return menuItems.filter(item => {
      const matchesSearch = searchTerm === "" || 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCourse = selectedCourse === "all" || item.courseType === selectedCourse;

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

  const activeFiltersCount = (selectedAllergens.length > 0 ? 1 : 0) + (selectedCourse !== "all" ? 1 : 0);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold mb-6 md:mb-8 text-center">
          {restaurant.name}
        </h1>

        <Collapsible
          open={isFiltersOpen}
          onOpenChange={setIsFiltersOpen}
          className="mb-6 md:mb-8"
        >
          <div className="bg-white rounded-lg shadow">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full flex items-center justify-between p-4 hover:bg-transparent"
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Filters</span>
                  {activeFiltersCount > 0 && (
                    <Badge variant="secondary">{activeFiltersCount} active</Badge>
                  )}
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isFiltersOpen ? 'transform rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="p-4 border-t">
                <div className="space-y-4">
                  {/* Search Bar */}
                  <div>
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
                  <div>
                    <Label className="mb-2 block">Exclude Allergens</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {allergensList.map((allergen) => (
                        <div
                          key={allergen}
                          className="flex items-center space-x-2 p-2 rounded hover:bg-gray-50"
                        >
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
                          <Label
                            htmlFor={allergen}
                            className="capitalize text-sm cursor-pointer select-none"
                          >
                            {allergen}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>

        {Object.keys(groupedMenuItems).length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No menu items match your filters
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedMenuItems).map(([courseType, items]) => (
              <div key={courseType}>
                <h2 className="text-xl md:text-2xl font-semibold mb-4 text-primary">
                  {courseType}
                </h2>
                <div className="grid md:grid-cols-2 gap-4 md:gap-6">
                  {items.map((item) => (
                    <Card key={item.id}>
                      <CardContent className="p-4 md:p-6">
                        {item.image && (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-48 object-cover rounded-md mb-4"
                          />
                        )}
                        <h3 className="text-lg md:text-xl font-semibold mb-2">
                          {item.name}
                        </h3>
                        <p className="text-muted-foreground text-sm mb-4">
                          {item.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">
                            ${parseFloat(item.price).toFixed(2)}
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {item.customTags?.map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {Object.entries(item.allergens)
                              .filter(([_, value]) => value)
                              .map(([key]) => (
                                <Badge
                                  key={key}
                                  variant="default"
                                  className="bg-primary/10 text-primary hover:bg-primary/20 text-xs"
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