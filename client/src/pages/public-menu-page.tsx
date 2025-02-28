import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { type MenuItem, type Restaurant, courseTypes } from "@shared/schema";
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

// Array of food-related image URLs
const foodImages = [
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=600&fit=crop&q=80',
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop&q=80',
  'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&h=600&fit=crop&q=80',
  'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&h=600&fit=crop&q=80',
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=600&fit=crop&q=80',
  'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&h=600&fit=crop&q=80',
  'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=800&h=600&fit=crop&q=80',
  'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=800&h=600&fit=crop&q=80',
];

const MenuCard = ({ item }: { item: MenuItem }) => {
  return (
    <Card className="bg-white rounded-xl shadow-lg w-[300px] mx-2 mb-6 border border-gray-200">
      <CardContent className="p-4 space-y-4 flex flex-col h-full">
        {/* Title */}
        <h3 className="text-2xl font-bold text-gray-900">{item.name}</h3>

        {/* Allergens */}
        <div className="flex flex-wrap gap-1 items-center mb-3 w-full overflow-hidden">
          <span className="text-gray-700 mr-1 text-sm font-medium">Contains</span>
          {Object.entries(item.allergens)
            .filter(([_, value]) => value)
            .map(([key]) => (
              <Badge
                key={key}
                className="bg-blue-500 text-white hover:bg-blue-600 rounded-full px-2 py-0.5 text-xs font-medium"
              >
                {key}
              </Badge>
            ))}
        </div>

        {/* Image - Only show on larger screens */}
        <div className="hidden md:block mb-4 min-h-[120px]">
          <img
            src={foodImages[item.id % foodImages.length]}
            alt={`${item.name} presentation`}
            className="w-full flex-1 object-cover rounded-lg min-h-[120px] max-h-[30vh]"
            draggable="false"
          />
        </div>

        {/* Description */}
        <p className="text-gray-700 text-sm font-medium">
          {item.description}
        </p>

        {/* Price */}
        <div className="mt-auto">
          <span className="text-gray-800 text-xl font-bold">
            ${parseFloat(item.price).toFixed(2)}
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
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [selectedAllergens, setSelectedAllergens] = useState<AllergenType[]>([]);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isCourseOpen, setIsCourseOpen] = useState(false);

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

  const filteredItems = useMemo(() => {
    if (!menuItems) return [];

    const lowerSearch = searchTerm.toLowerCase();

    return menuItems.filter(({ name, description, courseType, allergens }) => {
      return (
        (!searchTerm || name.toLowerCase().includes(lowerSearch) || description.toLowerCase().includes(lowerSearch)) &&
        (selectedCourse === "all" || courseType === selectedCourse) &&
        selectedAllergens.every(allergen => !allergens[allergen])
      );
    });
  }, [menuItems, searchTerm, selectedCourse, selectedAllergens]);

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

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#FFFFFF]">
      {/* Header with filters toggle and status */}
      <div className="w-full border-b bg-[#FFFFFF] z-50">
        <div className="max-w-md mx-auto px-4 py-2">
          {/* Toggle Buttons */}
          <div className="flex justify-center gap-4 mb-2">
            {/* Filters Toggle */}
            <Button 
              variant="ghost" 
              onClick={() => setIsFiltersOpen(!isFiltersOpen)}
              className="rounded-full px-4 py-1 bg-white text-gray-800 text-lg font-semibold flex items-center gap-1 border-0 hover:bg-white shadow-none ring-0 outline-none"
            >
              Filters {isFiltersOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </Button>

            {/* Course Type Toggle */}
            <div className="relative">
              <Button
                variant="ghost"
                onClick={() => setIsCourseOpen(!isCourseOpen)}
                className="rounded-full px-4 py-1 bg-white text-gray-800 text-lg font-semibold flex items-center gap-1 border-0 hover:bg-white shadow-none ring-0 outline-none"
              >
                {selectedCourse === "all" ? "All Courses" : selectedCourse}
                <ChevronDown className={`ml-1 w-4 h-4 transition-transform ${isCourseOpen ? 'rotate-180' : ''}`} />
              </Button>

              {isCourseOpen && (
                <div className="absolute z-50 top-full left-1/2 -translate-x-1/2 w-48 border divide-y bg-white shadow-lg mt-2 rounded-lg">
                  <button
                    onClick={() => {
                      setSelectedCourse("all");
                      setIsCourseOpen(false);
                    }}
                    className={`w-full px-4 py-3 text-center hover:bg-gray-100 ${
                      selectedCourse === "all" ? "hidden" : "text-gray-800"
                    }`}
                  >
                    All Courses
                  </button>
                  {courseTypes.map((type) => (
                    <button
                      key={type}
                      onClick={() => {
                        setSelectedCourse(type);
                        setIsCourseOpen(false);
                      }}
                      className={`w-full px-4 py-3 text-center hover:bg-gray-100 ${
                        selectedCourse === type ? "hidden" : "text-gray-800"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Current Filter Status */}
          <div className="text-center mb-2">
            <span className="text-blue-600 font-medium text-sm">Showing: </span>
            <span className="text-gray-700 text-sm">
              {selectedAllergens.length > 0 
                ? `Items that contain No ${selectedAllergens.map(a => a.charAt(0).toUpperCase() + a.slice(1)).join(', ')}` 
                : "All menu items"}
            </span>
          </div>
        </div>

        {/* Filters Panel */}
        <Collapsible
          open={isFiltersOpen}
          onOpenChange={setIsFiltersOpen}
        >
          <CollapsibleContent className="bg-white shadow-md z-40">
            <div className="max-w-md mx-auto px-4 py-6 space-y-6">
              {/* Search Bar */}
              <div className="relative">
                <Input
                  placeholder="Search menu"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full py-2 px-4 bg-white text-gray-800 placeholder:text-gray-500 rounded-full border border-gray-300 text-center"
                />
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
              </div>

              {/* Allergen Filters */}
              <div className="text-center">
                <p className="text-gray-800 mb-3 font-medium">I'm allergic to</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {allergensList.map((allergen) => (
                    <Button
                      key={allergen}
                      variant="outline"
                      className={`rounded-full text-xs px-3 py-1 h-auto transition-colors duration-0 focus:ring-0 focus:outline-none
                        ${
                          selectedAllergens.includes(allergen)
                            ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-600 hover:text-white"
                            : "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200"
                        }`}
                      onClick={() => {
                        setSelectedAllergens((prev) =>
                          prev.includes(allergen)
                            ? prev.filter((a) => a !== allergen)
                            : [...prev, allergen]
                        );
                      }}
                    >
                      {allergen}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Menu Items Container - Flex grow to fill available space */}
      <div className="flex-1 overflow-y-auto">
        {/* Carousel Container */}
        <div className="h-full flex items-center justify-center px-4">
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
              className="w-full max-w-5xl relative"
            >
              <CarouselContent className="-ml-2 md:-ml-4">
                {filteredItems.map((item) => (
                  <CarouselItem key={item.id} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
                    <MenuCard item={item} />
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="absolute left-1 -translate-y-1/2" />
              <CarouselNext className="absolute right-1 -translate-y-1/2" />
            </Carousel>
          )}
        </div>
      </div>

      {/* Footer navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#FFFFFF] border-t border-gray-800 p-3 flex justify-between items-center z-50">
        <div className="w-8 h-8 flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h2 className="text-lg font-bold text-gray-800">{restaurant?.name}</h2>
        <div className="w-8 h-8 flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="5" stroke="white" strokeWidth="2"/>
            <path d="M12 2V4" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            <path d="M12 20V22" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            <path d="M4.92993 4.93005L6.33993 6.34005" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            <path d="M17.6599 17.66L19.0699 19.07" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            <path d="M2 12H4" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            <path d="M20 12H22" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            <path d="M6.33993 17.66L4.92993 19.07" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            <path d="M19.0699 4.93005L17.6599 6.34005" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
      </div>
    </div>
  );
}