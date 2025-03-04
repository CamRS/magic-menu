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
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

type AllergenType = keyof MenuItem['allergens'];
const allergensList: AllergenType[] = ['milk', 'eggs', 'peanuts', 'nuts', 'shellfish', 'fish', 'soy', 'gluten'];

const dietaryPreferences = ['Vegetarian', 'Vegan'] as const;

const MenuCard = ({ item }: { item: MenuItem }) => {
  // Get active allergens
  const activeAllergens = Object.entries(item.allergens)
    .filter(([_, value]) => value)
    .map(([key]) => key);

  return (
    <Card className="h-full bg-white rounded-3xl shadow-sm border border-gray-100">
      <CardContent className="p-6 flex flex-col h-full">
        {/* Course type with original name */}
        {(item.courseTags?.[0] || item.course_original) && (
          <div className="mb-2 text-gray-600">
            <div className="text-base">{item.courseTags?.[0]}</div>
            {item.course_original && (
              <div className="text-sm text-gray-500">
                {item.course_original}
              </div>
            )}
          </div>
        )}

        {/* Title with original name */}
        <div className="mb-4">
          <h3 className="text-2xl font-bold text-gray-900">
            {item.name}
          </h3>
          {item.name_original && (
            <div className="text-base text-gray-600">
              {item.name_original}
            </div>
          )}
        </div>

        {/* Allergens section */}
        {activeAllergens.length > 0 && (
          <div className="mb-4">
            <div className="text-sm text-gray-600 mb-2">Often Contains</div>
            <div className="flex flex-wrap gap-2">
              {activeAllergens.map((allergen) => (
                <Badge
                  key={allergen}
                  variant="secondary"
                  className="bg-blue-100 text-blue-700 border-none rounded-full capitalize"
                >
                  {allergen}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Description section */}
        {item.description && (
          <div className="mb-4">
            <div className="text-sm text-gray-600 mb-1">Common Description</div>
            <p className="text-gray-800">
              {item.description}
            </p>
          </div>
        )}

        {/* Price */}
        <div className="mt-auto">
          <span className="text-xl font-semibold text-gray-900">
            {item.price && parseFloat(item.price) > 0 ? `$${parseFloat(item.price).toFixed(2)}` : ''}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

// Array of food-related image URLs
const foodImages = [
  '/attached_assets/image_1741128275695.png',
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=600&fit=crop&q=80',
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop&q=80',
  'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&h=600&fit=crop&q=80',
  'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&h=600&fit=crop&q=80',
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=600&fit=crop&q=80',
  'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&h=600&fit=crop&q=80',
  'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=800&h=600&fit=crop&q=80',
];

export default function PublicMenuPage() {
  const [matches, params] = useRoute("/menu/:restaurantId");
  const restaurantId = params?.restaurantId ? parseInt(params.restaurantId) : null;
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedAllergens, setSelectedAllergens] = useState<AllergenType[]>([]);
  const [selectedDietary, setSelectedDietary] = useState<typeof dietaryPreferences[number][]>([]);
  const [activeDropdown, setActiveDropdown] = useState<"filters" | "tags" | null>(null);

  const { data: restaurant, isLoading: isLoadingRestaurant } = useQuery<Restaurant>({
    queryKey: [`/api/restaurants/${restaurantId}`],
    queryFn: async () => {
      const res = await fetch(`/api/restaurants/${restaurantId}`, {
        credentials: 'omit'
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch restaurant details`);
      }
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

  if (error) {
    return <p className="text-red-500">Error loading menu items: {error.message}</p>;
  }

  // Get unique tags from all menu items
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

    const lowerSearch = searchTerm.toLowerCase();

    return menuItems
      .filter(({ name, description, courseTags, allergens }) => {
        const matchesSearch = !searchTerm || 
          name.toLowerCase().includes(lowerSearch) || 
          description.toLowerCase().includes(lowerSearch);

        const matchesTags = selectedTags.length === 0 || 
          selectedTags.every(tag => courseTags?.includes(tag));

        const matchesAllergens = selectedAllergens.every(allergen => !allergens[allergen]);

        return matchesSearch && matchesTags && matchesAllergens;
      })
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)); // Sort by displayOrder
  }, [menuItems, searchTerm, selectedTags, selectedAllergens]);

  if (!matches || !restaurantId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFFFF]">
        <p className="text-[#FFFFFF]">Restaurant not found</p>
      </div>
    );
  }

  if (isLoadingRestaurant || isLoadingMenu) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFFFF]">
        <Loader2 className="h-8 w-8 animate-spin text-[#FFFFFF]" />
      </div>
    );
  }

  const toggleDropdown = (dropdown: "filters" | "tags") => {
    setActiveDropdown(activeDropdown === dropdown ? null : dropdown);
  };

  return (
    <div
      className="h-screen flex flex-col overflow-hidden bg-gray-50"
      data-restaurant-id={restaurantId}
      id="public-menu-container"
    >
      <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b">
        <div className="max-w-md mx-auto px-4 py-2">
          <div className="relative mb-4">
            <Input
              placeholder="Search menu items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full py-2 px-4 bg-white text-gray-800 placeholder:text-gray-500 rounded-full border border-gray-200"
            />
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
          </div>

          <div className="flex justify-between items-center gap-4">
            <Button
              variant="outline"
              onClick={() => toggleDropdown("filters")}
              className={`flex-1 justify-between items-center px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 ${
                activeDropdown === "filters" ? "bg-gray-50" : ""
              }`}
            >
              Filter by Allergen
              {activeDropdown === "filters" ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>

            <Button
              variant="outline"
              onClick={() => toggleDropdown("tags")}
              className={`flex-1 justify-between items-center px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 ${
                activeDropdown === "tags" ? "bg-gray-50" : ""
              }`}
            >
              {selectedTags.length === 0 ? "All Items" : `${selectedTags.length} Selected`}
              {activeDropdown === "tags" ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <Collapsible
          open={activeDropdown === "filters"}
          onOpenChange={(open) => setActiveDropdown(open ? "filters" : null)}
        >
          <CollapsibleContent className="bg-white shadow-sm border-t">
            <div className="max-w-md mx-auto px-4 py-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">Allergens</h3>
                <div className="grid grid-cols-2 gap-2">
                  {allergensList.map((allergen) => (
                    <Button
                      key={allergen}
                      variant="outline"
                      className={`justify-start gap-2 ${
                        selectedAllergens.includes(allergen)
                          ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200"
                          : "bg-gray-50 text-gray-700 border-gray-200"
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
                <h3 className="text-lg font-semibold mb-3">Dietary Preferences</h3>
                <div className="grid grid-cols-2 gap-2">
                  {dietaryPreferences.map((pref) => (
                    <Button
                      key={pref}
                      variant="outline"
                      className={`justify-start gap-2 ${
                        selectedDietary.includes(pref)
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-gray-50 text-gray-700 border-gray-200"
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
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Collapsible
          open={activeDropdown === "tags"}
          onOpenChange={(open) => setActiveDropdown(open ? "tags" : null)}
        >
          <CollapsibleContent className="bg-white shadow-sm border-t">
            <div className="max-w-md mx-auto px-4 py-6">
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  className={`w-full justify-start text-lg ${
                    selectedTags.length === 0 ? "bg-gray-50" : ""
                  }`}
                  onClick={() => {
                    setSelectedTags([]);
                    setActiveDropdown(null);
                  }}
                >
                  All Items
                </Button>
                {uniqueTags.map((tag) => (
                  <Button
                    key={tag}
                    variant="ghost"
                    className={`w-full justify-start text-lg ${
                      selectedTags.includes(tag) ? "bg-gray-50" : ""
                    }`}
                    onClick={() => {
                      setSelectedTags(prev =>
                        prev.includes(tag)
                          ? prev.filter(t => t !== tag)
                          : [...prev, tag]
                      );
                    }}
                  >
                    {tag}
                  </Button>
                ))}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      <div className="flex-1 relative overflow-hidden pt-[200px]">
        <div className="absolute inset-0 flex items-center justify-center px-4">
          {filteredItems.length === 0 ? (
            <div className="text-center py-8 text-gray-800">
              No menu items match your filters
            </div>
          ) : (
            <Carousel
              opts={{
                align: "center",
                loop: true,
              }}
              className="w-full max-w-5xl"
            >
              <CarouselContent className="-ml-2 md:-ml-4">
                {filteredItems.map((item) => (
                  <CarouselItem key={item.id} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
                    <MenuCard item={item} />
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 flex justify-between items-center z-50">
        <div className="w-8 h-8 flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h2 className="text-lg font-bold text-gray-800">{restaurant?.name}</h2>
        <div className="w-8 h-8 flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2"/>
            <path d="M12 2V4M12 20V22M4.93 4.93L6.34 6.34M17.66 17.66L19.07 19.07M2 12H4M20 12H22M6.34 17.66L4.93 19.07M19.07 4.93L17.66 6.34" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
      </div>
    </div>
  );
}