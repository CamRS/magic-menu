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
    <Card className="bg-white rounded-xl overflow-hidden shadow-lg w-[300px] mx-2">
      <CardContent className="p-4 space-y-4">
        {/* Title */}
        <h3 className="text-2xl font-bold text-gray-900">{item.name}</h3>

        {/* Allergens */}
        <div className="flex flex-wrap gap-2 items-center mb-3">
          <span className="text-gray-700 mr-2 text-sm">Contains</span>
          {Object.entries(item.allergens)
            .filter(([_, value]) => value)
            .map(([key]) => (
              <Badge
                key={key}
                className="bg-blue-500 text-gray-800 hover:bg-blue-600 rounded-full px-2.5 py-1 text-xs"
              >
                {key}
              </Badge>
            ))}
        </div>

        {/* Image */}
        <div className="mb-4">
          <img
            src={foodImages[item.id % foodImages.length]}
            alt={`${item.name} presentation`}
            className="w-full h-48 object-cover rounded-lg"
            draggable="false"
          />
        </div>

        {/* Description */}
        <p className="text-gray-700 text-sm min-h-[3rem]">
          {item.description}
        </p>

        {/* Price */}
        <div>
          <span className="text-gray-500 text-xl font-semibold">
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
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5]">
        <p className="text-[#FFFFFF]">Restaurant not found</p>
      </div>
    );
  }

  if (isLoadingRestaurant || isLoadingMenu) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5]">
        <Loader2 className="h-8 w-8 animate-spin text-[#FFFFFF]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-32 antialiased">
      <div className="w-full py-2 px-3 border-b border-gray-800 sticky top-0 bg-[#F5F5F5] z-50">
        <div className="max-w-6xl mx-auto space-y-4">
          {/* Toggle Button */}
          <div className="flex justify-center mb-2">
            <Button 
              variant="ghost" 
              onClick={() => setIsFiltersOpen(!isFiltersOpen)}
              className="rounded-full px-4 py-1 bg-gray-900 text-gray-800 text-xs font-medium flex items-center gap-1 border-0 hover:bg-gray-800"
            >
              Filters {isFiltersOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </Button>
          </div>

          {/* Current Filter Status */}
          <div className="text-center mb-4">
            <span className="text-blue-700 font-medium text-xs">Showing:</span>{" "}
            <span className="text-gray-700 text-xs">
              {filteredItems.length === menuItems?.length
                ? "All menu items"
                : `${filteredItems.length} filtered items`}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-2 relative">
        {/* Filters Section */}
        <Collapsible
          open={isFiltersOpen}
          onOpenChange={setIsFiltersOpen}
          className={`absolute top-0 left-0 right-0 z-50 ${isFiltersOpen ? 'bg-white/90 backdrop-blur-lg transform scale-100' : ''}`}
        >
          <CollapsibleContent className="space-y-6 px-4 py-4 flex flex-col items-center transform scale-100">
            {/* Search Bar */}
            <div className="w-full max-w-md">
              <Input
                placeholder="Search menu"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full py-2 px-4 bg-white text-gray-800 placeholder:text-gray-500 rounded-full border border-gray-300 text-center"
              />
            </div>

            {/* Allergen Filters */}
            <div className="text-center w-full max-w-md">
              <p className="text-gray-800 mb-3 font-medium">I'm allergic to</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {allergensList.map((allergen) => (
                  <Button
                    key={allergen}
                    variant="outline"
                    className={`rounded-full text-xs px-3 py-1 h-auto
                      hover:bg-gray-400 hover:text-white
                      ${selectedAllergens.includes(allergen)
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-800"}`}
                    onClick={() => {
                      setSelectedAllergens(prev =>
                        prev.includes(allergen)
                          ? prev.filter(a => a !== allergen)
                          : [...prev, allergen]
                      );
                    }}
                  >
                    {allergen}
                  </Button>
                ))}
              </div>
            </div>

            {/* Course Type Dropdown */}
            <div className="w-full max-w-md">
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger className="bg-gray-900 border-gray-800 text-[#FFFFFF] w-full rounded-xl">
                  <SelectValue placeholder="All Courses" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-800">
                  <SelectItem value="all" className="text-[#FFFFFF]">All Courses</SelectItem>
                  {courseTypes.map((type) => (
                    <SelectItem key={type} value={type} className="text-[#FFFFFF]">
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Menu Items Carousel */}
        <div className="w-full my-8 px-8">
          {filteredItems.length === 0 ? (
            <div className="text-center py-8 text-gray-800">
              No menu items match your filters
            </div>
          ) : (
            <Carousel
              opts={{
                align: "start",
                loop: true,
              }}
              className="w-full"
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

      {/* Footer navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#F5F5F5] border-t border-gray-800 p-3 flex justify-between items-center z-50">
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