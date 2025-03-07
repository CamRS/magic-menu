import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { type MenuItem, type Restaurant } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, Loader2, Search, ChevronUp, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import useEmblaCarousel from 'embla-carousel-react';
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
import { useState, useMemo, useEffect, useCallback } from "react";

type AllergenType = keyof MenuItem['allergens'];
const allergensList: AllergenType[] = ['milk', 'eggs', 'peanuts', 'nuts', 'shellfish', 'fish', 'soy', 'gluten'];

const dietaryPreferences = ['Vegetarian', 'Vegan'] as const;

const MenuCard = ({ item }: { item: MenuItem }) => {
  const activeAllergens = Object.entries(item.allergens)
    .filter(([_, value]) => value)
    .map(([key]) => key);

  const courseTag = item.courseTags?.[0] || '';

  return (
    <Card className="flex-[0_0_90%] sm:flex-[0_0_45%] lg:flex-[0_0_30%] mx-2 bg-white rounded-3xl shadow-sm border border-gray-100">
      <CardContent className="p-8 flex flex-col gap-5 justify-between h-full">
        <div className="flex items-center gap-2">
          {courseTag && (
            <div className="text-gray-600 text-sm">
              {courseTag}
            </div>
          )}
          <div className="text-sm text-gray-300">
            {item.course_original}
          </div>
        </div>

        <div>
          {item.name_original && (
            <div className="text-sm text-gray-300">
              {item.name_original}
            </div>
          )}
          <h3 className="text-2xl leading-tight font-medium text-gray-900">
            {item.name}
          </h3>
        </div>

        {activeAllergens.length > 0 && (
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-blue-600">Contains</span>
              <div className="flex flex-wrap gap-2">
                {activeAllergens.map((allergen) => (
                  <Badge
                    key={allergen}
                    variant="secondary"
                    className="bg-[#4169E1]/10 text-[#4169E1] border-none rounded-full capitalize px-3 py-0.5 text-sm"
                  >
                    {allergen}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}
        {/* Image - only shown if "image" field exists and has content */}
        {item.image && (
          <div className="w-full h-[200px] rounded-lg">
            <img
              src={item.image}
              alt={item.name}
              className="w-full h-full object-cover rounded-lg"
              onError={(e) => {
                // Fallback to gray placeholder if image fails to load
                e.currentTarget.onerror = null; // Prevent infinite loop
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  parent.classList.add('bg-gray-200');
                }
              }}
            />
          </div>
        )}

        <div>
          {item.description && (
            <p className="text-gray-600 text-md leading-relaxed">
              {item.description}
            </p>
          )}
        </div>

        <div>
          <span className="text-lg font-normal text-gray-600">
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

  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
    dragFree: true,
    slidesToScroll: 1
  });

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const [prevBtnEnabled, setPrevBtnEnabled] = useState(false);
  const [nextBtnEnabled, setNextBtnEnabled] = useState(false);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setPrevBtnEnabled(emblaApi.canScrollPrev());
    setNextBtnEnabled(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
  }, [emblaApi, onSelect]);

  const { data: restaurant, isLoading: isLoadingRestaurant } = useQuery<Restaurant>({
    queryKey: [`/api/restaurants/${restaurantId}`],
    enabled: !!restaurantId,
  });

  const { data: menuItems, isLoading: isLoadingMenu, error } = useQuery<MenuItem[]>({
    queryKey: [`/api/menu-items`, restaurantId],
    queryFn: async () => {
      if (!restaurantId) {
        throw new Error('Restaurant ID is required');
      }

      console.log(`Fetching menu items for restaurant ${restaurantId}`);
      const response = await fetch(`/api/menu-items?${new URLSearchParams({
        restaurantId: restaurantId.toString(),
        status: 'live'
      })}`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch menu items');
      }

      const items = await response.json();
      console.log(`Retrieved ${items.length} menu items for restaurant ${restaurantId}`);
      return items;
    },
    enabled: !!restaurantId,
    retry: 2,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
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

  const handleTagSelection = (value: string) => {
    if (value === "all") {
      setSelectedTags([]);
    } else {
      const tags = value.split(",").filter(Boolean);
      setSelectedTags(tags);
    }
  };

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
      <header className="fixed top-0 left-0 right-0 bg-white border-b z-50">
        <div className="max-w-4xl mx-auto h-[60px] px-4 flex items-center gap-4">
          <div className="flex items-center gap-4 flex-1">
            <h1 className="text-lg font-semibold text-gray-900 whitespace-nowrap">
              {restaurant?.name}
            </h1>
            <div className="relative flex-1 max-w-xs">
              <Input
                placeholder="Search menu..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 h-9 rounded-full border-gray-200 bg-white text-sm"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFiltersOpen(!isFiltersOpen)}
              className="h-9 px-3 flex items-center gap-1"
            >
              Filters
              {isFiltersOpen ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </Button>

            <Select
              value={selectedTags.length === 0 ? "all" : selectedTags.join(",")}
              onValueChange={handleTagSelection}
            >
              <SelectTrigger className="h-9 w-[130px] text-sm">
                <SelectValue placeholder="All Courses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                {Array.from(uniqueTags).map((tag) => (
                  <SelectItem key={tag} value={tag}>
                    {tag}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
          <CollapsibleContent className="border-t bg-white">
            <div className="max-w-4xl mx-auto px-4 py-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <h3 className="text-sm font-medium mb-2">Allergens</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {allergensList.map((allergen) => (
                      <Button
                        key={allergen}
                        variant="outline"
                        size="sm"
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

                <div className="flex-1 min-w-[200px]">
                  <h3 className="text-sm font-medium mb-2">Dietary Preferences</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {dietaryPreferences.map((pref) => (
                      <Button
                        key={pref}
                        variant="outline"
                        size="sm"
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
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </header>

      <main className={`pt-[${isFiltersOpen ? '180px' : '76px'}] px-4 pb-20 max-w-4xl mx-auto`}>
        {filteredItems.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No menu items match your filters
          </div>
        ) : (
          <div className="relative py-8">
            <div className="overflow-hidden -mx-4 px-4" ref={emblaRef}>
              <div className="flex items-center -mx-2">
                {filteredItems.map((item) => (
                  <MenuCard key={item.id} item={item} />
                ))}
              </div>
            </div>

            <div className="absolute inset-y-0 left-0 flex items-center">
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 rounded-full bg-white shadow-md ${!prevBtnEnabled && 'opacity-50 cursor-not-allowed'}`}
                onClick={scrollPrev}
                disabled={!prevBtnEnabled}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>

            <div className="absolute inset-y-0 right-0 flex items-center">
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 rounded-full bg-white shadow-md ${!nextBtnEnabled && 'opacity-50 cursor-not-allowed'}`}
                onClick={scrollNext}
                disabled={!nextBtnEnabled}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}