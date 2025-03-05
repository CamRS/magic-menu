import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { type MenuItem, type Restaurant } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, Loader2, Search, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState, useMemo } from "react";

type AllergenType = keyof MenuItem['allergens'];
const allergensList: AllergenType[] = ['milk', 'eggs', 'peanuts', 'nuts', 'shellfish', 'fish', 'soy', 'gluten'];

const dietaryPreferences = ['Vegetarian', 'Vegan'] as const;

const MenuCard = ({ item }: { item: MenuItem }) => {
  const activeAllergens = Object.entries(item.allergens)
    .filter(([_, value]) => value)
    .map(([key]) => key);

  return (
    <Card className="w-full bg-white rounded-xl shadow-sm border border-gray-100 h-full">
      <CardContent className="p-6">
        {/* Title with original name */}
        <div className="mb-4">
          <h3 className="text-xl font-semibold text-gray-900">
            {item.name}
          </h3>
          {item.name_original && (
            <div className="text-base text-gray-600 mt-1">
              {item.name_original}
            </div>
          )}
        </div>

        {/* Description */}
        {item.description && (
          <p className="text-gray-700 mb-4 line-clamp-3">
            {item.description}
          </p>
        )}

        {/* Allergens */}
        {activeAllergens.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              {activeAllergens.map((allergen) => (
                <Badge
                  key={allergen}
                  variant="secondary"
                  className="bg-[#4169E1]/10 text-[#4169E1] border-none rounded-full capitalize px-3 py-1 text-xs"
                >
                  {allergen}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Price */}
        <div className="mt-auto pt-2">
          <span className="text-xl font-semibold text-gray-900">
            {item.price && parseFloat(item.price) > 0 ? `$${parseFloat(item.price).toFixed(2)}` : ''}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default function PublicMenuPage() {
  const [matches, params] = useRoute("/menu/:restaurantId");
  const restaurantId = params?.restaurantId ? parseInt(params.restaurantId) : null;
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedAllergens, setSelectedAllergens] = useState<AllergenType[]>([]);
  const [selectedDietary, setSelectedDietary] = useState<typeof dietaryPreferences[number][]>([]);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const { data: restaurant, isLoading: isLoadingRestaurant } = useQuery<Restaurant>({
    queryKey: [`/api/restaurants/${restaurantId}`],
    queryFn: async () => {
      const res = await fetch(`/api/restaurants/${restaurantId}`, {
        credentials: 'omit'
      });
      if (!res.ok) throw new Error(`Failed to fetch restaurant details`);
      return res.json();
    },
    enabled: !!restaurantId,
  });

  const { data: menuItems, isLoading: isLoadingMenu, error } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu-items"],
    queryFn: async () => {
      const response = await fetch(`/api/menu-items?restaurantId=${restaurantId}`, {
        credentials: 'omit'
      });
      if (!response.ok) throw new Error('Failed to fetch menu items');
      return response.json();
    },
    enabled: !!restaurantId,
    retry: 2,
    staleTime: 1000 * 60 * 5,
  });

  const uniqueTags = useMemo(() => {
    if (!menuItems) return [];
    const tagSet = new Set<string>();
    menuItems.forEach(item => {
      item.courseTags?.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [menuItems]);

  const filteredItems = useMemo(() => {
    if (!menuItems) return [];
    return menuItems
      .filter(({ name, description, courseTags, allergens }) => {
        const matchesSearch = !searchTerm || 
          name.toLowerCase().includes(searchTerm.toLowerCase()) || 
          description.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesTags = selectedTags.length === 0 || 
          selectedTags.every(tag => courseTags?.includes(tag));

        const matchesAllergens = selectedAllergens.every(allergen => !allergens[allergen]);

        return matchesSearch && matchesTags && matchesAllergens;
      })
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  }, [menuItems, searchTerm, selectedTags, selectedAllergens]);

  if (!matches || !restaurantId) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-500">Restaurant not found</p>
    </div>;
  }

  if (isLoadingRestaurant || isLoadingMenu) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
    </div>;
  }

  if (error) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-red-500">Error loading menu items: {error.message}</p>
    </div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white border-b z-50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-900">{restaurant?.name}</h1>
          </div>

          {/* Search and Filters */}
          <div className="space-y-3">
            <div className="relative">
              <Input
                placeholder="Search menu..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 h-11 rounded-full"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                className="flex-1 justify-between gap-2"
              >
                Filters
                {isFiltersOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>

              <Select
                value={selectedTags.join(",")}
                onValueChange={(value) => {
                  const tags = value.split(",").filter(Boolean);
                  setSelectedTags(tags);
                }}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="All Courses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Courses</SelectItem>
                  {uniqueTags.map((tag) => (
                    <SelectItem key={tag} value={tag}>
                      {tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Collapsible Filters */}
          <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
            <CollapsibleContent className="py-4 space-y-4">
              <div>
                <h3 className="font-medium mb-2">Allergens</h3>
                <div className="grid grid-cols-2 gap-2">
                  {allergensList.map((allergen) => (
                    <Button
                      key={allergen}
                      variant="outline"
                      className={`justify-start gap-2 ${
                        selectedAllergens.includes(allergen)
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : ""
                      }`}
                      onClick={() => {
                        setSelectedAllergens((prev) =>
                          prev.includes(allergen)
                            ? prev.filter((a) => a !== allergen)
                            : [...prev, allergen]
                        );
                      }}
                    >
                      <span className="capitalize">{allergen}</span>
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-2">Dietary Preferences</h3>
                <div className="grid grid-cols-2 gap-2">
                  {dietaryPreferences.map((pref) => (
                    <Button
                      key={pref}
                      variant="outline"
                      className={`justify-start gap-2 ${
                        selectedDietary.includes(pref)
                          ? "bg-green-50 text-green-700 border-green-200"
                          : ""
                      }`}
                      onClick={() => {
                        setSelectedDietary((prev) =>
                          prev.includes(pref)
                            ? prev.filter((p) => p !== pref)
                            : [...prev, pref]
                        );
                      }}
                    >
                      {pref}
                    </Button>
                  ))}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </header>

      {/* Menu Items Grid */}
      <main className="pt-[180px] px-4 pb-20 max-w-4xl mx-auto">
        {filteredItems.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No menu items match your filters
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((item) => (
              <MenuCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}