import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { type MenuItem, type Restaurant } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Sparkle, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import useEmblaCarousel from 'embla-carousel-react';
import { Button } from "@/components/ui/button";
import { useMenuUpdates } from '@/hooks/use-menu-updates';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useState, useMemo, useEffect, useCallback } from "react";

type AllergenType = keyof MenuItem['allergens'];
const allergensList: AllergenType[] = ['milk', 'eggs', 'peanuts', 'nuts', 'shellfish', 'fish', 'soy', 'gluten'];
const dietaryPreferences = ['Vegetarian', 'Vegan'] as const;

const MenuCard = ({ item }: { item: MenuItem }) => {
  const activeAllergens = Object.entries(item.allergens || {})
    .filter(([_, value]) => value)
    .map(([key]) => key);

  const courseTag = item.courseTags?.[0] || '';

  return (
    <Card className="flex-[0_0_90%] sm:flex-[0_0_45%] lg:flex-[0_0_30%] mx-2 bg-white rounded-3xl shadow-sm border border-gray-100">
      <CardContent className="p-8 flex flex-col gap-4 justify-between h-full min-h-[430px]">
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
            <span className="text-sm font-medium text-blue-600 block mb-2">Contains</span>
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
        )}

        {item.image && (
          <div className="w-full h-[200px] rounded-lg">
            <img
              src={item.image}
              alt={item.name}
              className="w-full h-full object-cover rounded-lg"
              onError={(e) => {
                e.currentTarget.onerror = null;
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
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
    dragFree: true,
  });

  // Enhanced restaurant query with error handling
  const { 
    data: restaurant, 
    isLoading: isLoadingRestaurant,
    error: restaurantError
  } = useQuery<Restaurant>({
    queryKey: [`/api/restaurants/${restaurantId}`],
    enabled: !!restaurantId,
    retry: 3,
    // Log any errors for debugging
    onError: (error) => {
      console.error('Restaurant fetch error:', error);
      setApiError(`Error loading restaurant: ${error.message}`);
    }
  });

  // Enhanced menu items query with error handling
  const { 
    data: menuItems, 
    isLoading: isLoadingMenuItems,
    error: menuItemsError
  } = useQuery<MenuItem[]>({
    queryKey: [`/api/menu-items/restaurant/${restaurantId}`], // Adjusted endpoint to match what might be expected by the API
    enabled: !!restaurantId,
    retry: 3,
    // Log any errors for debugging
    onError: (error) => {
      console.error('Menu items fetch error:', error);
      setApiError(`Error loading menu items: ${error.message}`);
    }
  });

  // Debug logging
  useEffect(() => {
    console.log('Restaurant ID:', restaurantId);
    console.log('Restaurant data:', restaurant);
    console.log('Menu items:', menuItems);
  }, [restaurantId, restaurant, menuItems]);

  // Apply allergen and dietary filters
  const filteredItems = useMemo(() => {
    if (!menuItems || !Array.isArray(menuItems)) {
      console.log('No menu items array available');
      return [];
    }

    console.log(`Filtering ${menuItems.length} menu items`);

    return menuItems.filter(item => {
      // Check search term
      const matchesSearch = !searchTerm ||
        item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase());

      // Check course tags
      const matchesTags = selectedTags.length === 0 ||
        (item.courseTags && selectedTags.some(tag => item.courseTags?.includes(tag)));

      // Check allergens
      const matchesAllergens = selectedAllergens.length === 0 ||
        !selectedAllergens.some(allergen => item.allergens?.[allergen]);

      // Check dietary preferences
      const matchesDietary = selectedDietary.length === 0 ||
        selectedDietary.some(pref => {
          if (pref === 'Vegetarian') return item.isVegetarian;
          if (pref === 'Vegan') return item.isVegan;
          return false;
        });

      return matchesSearch && matchesTags && matchesAllergens && matchesDietary;
    });
  }, [menuItems, searchTerm, selectedTags, selectedAllergens, selectedDietary]);

  const uniqueTags = useMemo(() => {
    if (!menuItems || !Array.isArray(menuItems)) return [];
    const tagSet = new Set<string>();
    menuItems.forEach(item => {
      if (item.courseTags) {
        item.courseTags.forEach(tag => {
          if (tag) tagSet.add(tag);
        });
      }
    });
    return Array.from(tagSet).sort();
  }, [menuItems]);

  const handleTagSelection = (tag: string) => {
    if (tag === "all") {
      setSelectedTags([]);
    } else {
      setSelectedTags(prev => 
        prev.includes(tag) 
          ? prev.filter(t => t !== tag) 
          : [...prev, tag]
      );
    }
  };

  // Navigation buttons for the carousel
  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => {
      setCanScrollPrev(emblaApi.canScrollPrev());
      setCanScrollNext(emblaApi.canScrollNext());
    };

    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    onSelect();

    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi]);

  // Custom hook for menu updates
  useMenuUpdates(restaurantId);

  const isLoading = isLoadingRestaurant || isLoadingMenuItems;
  const error = restaurantError || menuItemsError;

  // Check if we have items but for some reason aren't displaying them
  useEffect(() => {
    if (menuItems && menuItems.length > 0 && filteredItems.length === 0 && !searchTerm && selectedTags.length === 0) {
      console.warn('Have menu items but none are being displayed after filtering', { 
        menuItems, 
        filteredItems,
        searchTerm,
        selectedTags,
        selectedAllergens,
        selectedDietary
      });
    }
  }, [menuItems, filteredItems, searchTerm, selectedTags, selectedAllergens, selectedDietary]);

  if (!matches || !restaurantId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Restaurant not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="fixed top-0 left-0 right-0 bg-white border-b z-40">
        <div className="max-w-4xl mx-auto h-[48px] px-4">
          <div className="flex items-center justify-center h-full">
            <h1 className="text-md font-semibold text-gray-900 text-center">
              {restaurant?.name || 'Loading...'}
            </h1>
          </div>
        </div>

        <div className="border-t bg-white overflow-x-auto scrollbar-hide">
          <div className="max-w-4xl mx-auto px-4 py-2">
            <div className="flex space-x-2">
              <Button
                variant={selectedTags.length === 0 ? "default" : "outline"}
                className="rounded-full whitespace-nowrap"
                onClick={() => handleTagSelection("all")}
              >
                All Courses
              </Button>
              {uniqueTags.map((tag) => (
                <Button
                  key={tag}
                  variant={selectedTags.includes(tag) ? "default" : "outline"}
                  className="rounded-full whitespace-nowrap"
                  onClick={() => handleTagSelection(tag)}
                >
                  {tag}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="pt-[104px] pb-24 px-4 max-w-4xl mx-auto">
        {/* API Error Message */}
        {apiError && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6">
            {apiError}
          </div>
        )}

        {/* Debug Info (only in development) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-6 text-sm">
            <h3 className="font-bold mb-2">Debug Info:</h3>
            <p>Restaurant ID: {restaurantId}</p>
            <p>Menu Items Count: {menuItems?.length || 0}</p>
            <p>Filtered Items Count: {filteredItems.length}</p>
            <p>API URL: {`/api/menu-items/restaurant/${restaurantId}`}</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-500">
            Error loading data: {error.message}
          </div>
        ) : !menuItems || menuItems.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No menu items available
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No menu items match your filters
          </div>
        ) : (
          <div className="relative py-8">
            {/* Carousel Navigation Buttons */}
            <div className="flex justify-between absolute top-1/2 -translate-y-1/2 left-0 right-0 z-30 px-2">
              <Button 
                variant="outline" 
                size="icon" 
                className={`rounded-full bg-white/80 backdrop-blur-sm ${!canScrollPrev ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={scrollPrev}
                disabled={!canScrollPrev}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                className={`rounded-full bg-white/80 backdrop-blur-sm ${!canScrollNext ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={scrollNext}
                disabled={!canScrollNext}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>

            {/* Embla Carousel */}
            <div className="overflow-hidden" ref={emblaRef}>
              <div className="flex">
                {filteredItems.map((item) => (
                  <MenuCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t z-50">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Input
                placeholder="Search menu..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                className="w-full pl-10 pr-4 h-12 rounded-full border-gray-200 bg-white text-base"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            </div>

            <Drawer open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
              <DrawerTrigger asChild>
                <Button
                  variant="outline"
                  size="lg"
                  className="h-12 px-6 rounded-full border-2 border-gray-200 hover:bg-gray-50 hover:border-gray-300 relative flex items-center gap-2"
                >
                  <Sparkle className="h-5 w-5 text-gray-600" />
                  <span className="font-medium">Modify menu</span>
                  {(selectedAllergens.length > 0 || selectedDietary.length > 0) && (
                    <span className="absolute top-0 right-0 -mt-1 -mr-1 h-3 w-3 bg-blue-500 rounded-full" />
                  )}
                </Button>
              </DrawerTrigger>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Filters</DrawerTitle>
                  <DrawerDescription>
                    Customize your menu
                  </DrawerDescription>
                </DrawerHeader>
                <div className="px-4 py-2 space-y-6">
                  <div>
                    <h3 className="text-sm font-medium mb-3">Remove items containing...</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {allergensList.map((allergen) => (
                        <Button
                          key={allergen}
                          variant="outline"
                          className={`justify-start gap-2 h-12 border-2 border-gray-200 ${
                            selectedAllergens.includes(allergen)
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "hover:bg-gray-50 hover:border-gray-300"
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
                    <h3 className="text-sm font-medium mb-3">Only show items that are...</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {dietaryPreferences.map((pref) => (
                        <Button
                          key={pref}
                          variant="outline"
                          className={`justify-start gap-2 h-12 border-2 border-gray-200 ${
                            selectedDietary.includes(pref)
                              ? "bg-green-50 text-green-700 border-green-200"
                              : "hover:bg-gray-50 hover:border-gray-300"
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
                <DrawerFooter>
                  <DrawerClose asChild>
                    <Button
                      size="lg"
                      className="w-full h-12 text-base font-medium"
                    >
                      Done
                    </Button>
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          </div>
        </div>
      </div>
    </div>
  );
}