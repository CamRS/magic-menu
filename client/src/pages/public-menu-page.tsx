import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { type MenuItem, type Restaurant } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Filter, X, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import useEmblaCarousel from 'embla-carousel-react';
import { Button } from "@/components/ui/button";
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

      const response = await fetch(`/api/menu-items?${new URLSearchParams({
        restaurantId: restaurantId.toString()
      })}`, {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch menu items');
      }

      const data = await response.json();
      console.log('Menu items response:', data);
      return data.items || [];
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

  if (!matches || !restaurantId || isLoadingRestaurant) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">
      {!matches || !restaurantId ? (
        <p className="text-gray-500">Restaurant not found</p>
      ) : (
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      )}
    </div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="fixed top-0 left-0 right-0 bg-white border-b z-40">
        <div className="max-w-4xl mx-auto h-[50px] px-4">
          <div className="flex items-center justify-center h-full">
            <h1 className="text-lg font-semibold text-gray-900 text-center">
              {restaurant?.name}
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
              {Array.from(uniqueTags).map((tag) => (
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
        {isLoadingMenu ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-500">
            Error loading menu items: {error instanceof Error ? error.message : 'Unknown error'}
          </div>
        ) : !menuItems?.length ? (
          <div className="text-center py-8 text-gray-500">
            No menu items available
          </div>
        ) : (
          <div className="relative py-8">
            <div className="overflow-hidden -mx-4 px-4" ref={emblaRef}>
              <div className="flex items-center -mx-2">
                {menuItems.map((item) => (
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
                  <Filter className="h-5 w-5 text-gray-600" />
                  <span className="font-medium">Allergies</span>
                  {(selectedAllergens.length > 0 || selectedDietary.length > 0) && (
                    <span className="absolute top-0 right-0 -mt-1 -mr-1 h-3 w-3 bg-blue-500 rounded-full" />
                  )}
                </Button>
              </DrawerTrigger>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Filters</DrawerTitle>
                  <DrawerDescription>
                    Customize your menu view
                  </DrawerDescription>
                </DrawerHeader>
                <div className="px-4 py-2 space-y-6">
                  <div>
                    <h3 className="text-sm font-medium mb-3">Allergens</h3>
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
                    <h3 className="text-sm font-medium mb-3">Dietary Preferences</h3>
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