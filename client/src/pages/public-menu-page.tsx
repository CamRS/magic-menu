import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { type MenuItem, type Restaurant, courseTypes } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { useState, useMemo } from "react";

type AllergenType = keyof MenuItem['allergens'];
const allergensList: AllergenType[] = ['milk', 'eggs', 'peanuts', 'nuts', 'shellfish', 'fish', 'soy', 'gluten'];

export default function PublicMenuPage() {
  const [matches, params] = useRoute("/menu/:restaurantId");
  const restaurantId = params?.restaurantId;
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [selectedAllergens, setSelectedAllergens] = useState<AllergenType[]>([]);

  const { data: restaurant } = useQuery<Restaurant>({
    queryKey: ["/api/restaurants", restaurantId],
    enabled: !!restaurantId,
  });

  const { data: menuItems = [], isLoading, error } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu-items", restaurantId],
    enabled: !!restaurantId,
    retry: 3,
    staleTime: 30000,
  });

  console.log('Restaurant ID:', restaurantId);
  console.log('Menu Items:', menuItems);
  console.log('Query Error:', error);

  const filteredItems = useMemo(() => {
    if (!menuItems?.length) return [];

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

  if (!matches || !restaurantId || !restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <p className="text-gray-400">Restaurant not found</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <p className="text-gray-400">Error loading menu items</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto p-4">
        <h1 className="text-4xl font-bold text-center mb-8">
          {restaurant.name}
        </h1>

        <div className="space-y-6">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Search menu"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 py-6 bg-gray-900 border-gray-800 text-white placeholder:text-gray-400 rounded-xl"
            />
          </div>

          {/* Allergen Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-400">I'm allergic to</span>
            {allergensList.map((allergen) => (
              <button
                key={allergen}
                onClick={() => {
                  setSelectedAllergens(prev => 
                    prev.includes(allergen)
                      ? prev.filter(a => a !== allergen)
                      : [...prev, allergen]
                  );
                }}
                className={`px-4 py-2 rounded-full text-sm transition-colors ${
                  selectedAllergens.includes(allergen)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {allergen}
              </button>
            ))}
          </div>

          {/* Course Type Dropdown */}
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger className="bg-gray-900 border-gray-800 text-white w-full rounded-xl">
              <SelectValue placeholder="All Courses" />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-800">
              <SelectItem value="all">All Courses</SelectItem>
              {courseTypes.map((type) => (
                <SelectItem key={type} value={type} className="text-white">
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedAllergens.length > 0 && (
          <div className="mt-4 text-sm text-gray-400">
            Showing options free of {selectedAllergens.join(', ')}
          </div>
        )}

        <div className="mt-8">
          {!menuItems?.length ? (
            <div className="text-center py-8 text-gray-400">
              No menu items available
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No menu items match your filters
            </div>
          ) : (
            <Carousel className="w-full">
              <CarouselContent className="-ml-4">
                {filteredItems.map((item) => (
                  <CarouselItem key={item.id} className="pl-4 basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4">
                    <Card className="bg-gray-900 border-gray-800 overflow-hidden">
                      <CardContent className="p-0">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-64 object-cover"
                          />
                        ) : (
                          <div className="w-full h-64 bg-gray-800 flex items-center justify-center">
                            <span className="text-gray-600">No image</span>
                          </div>
                        )}
                        <div className="p-6">
                          <h3 className="text-xl font-semibold mb-2">{item.name}</h3>
                          <p className="text-gray-400 mb-4 line-clamp-2">
                            {item.description}
                          </p>
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-2xl font-bold">
                              ${parseFloat(item.price).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(item.allergens)
                              .filter(([_, value]) => value)
                              .map(([key]) => (
                                <Badge
                                  key={key}
                                  variant="outline"
                                  className="bg-gray-800 text-gray-300 border-gray-700"
                                >
                                  Contains {key}
                                </Badge>
                              ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="bg-gray-800 text-white border-gray-700" />
              <CarouselNext className="bg-gray-800 text-white border-gray-700" />
            </Carousel>
          )}
        </div>
      </div>
    </div>
  );
}