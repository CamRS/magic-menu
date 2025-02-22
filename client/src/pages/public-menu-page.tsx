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
  const [isFiltersOpen, setIsFiltersOpen] = useState(true);

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

  if (isLoadingRestaurant || isLoadingMenu) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-4xl font-bold pt-8 pb-6 text-center">
          {restaurant.name}
        </h1>

        <div className="mb-8">
          <div className="space-y-4">
            {/* Search Menu */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Search menu"
                className="w-full pl-10 py-6 bg-gray-900 border-gray-800 text-white placeholder:text-gray-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Allergen Filters */}
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-gray-400 mr-2 flex items-center">I'm allergic to</span>
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
                  className={`px-4 py-2 rounded-full text-sm ${
                    selectedAllergens.includes(allergen)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-300'
                  }`}
                >
                  {allergen}
                </button>
              ))}
            </div>

            {/* Course Type Dropdown */}
            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
              <SelectTrigger className="bg-gray-900 border-gray-800 text-white">
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
        </div>

        {selectedAllergens.length > 0 && (
          <div className="mb-4 text-sm text-gray-400">
            Showing options free of {selectedAllergens.join(', ')}
          </div>
        )}

        {filteredItems.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            No menu items match your filters
          </div>
        ) : (
          <div className="w-full">
            <Carousel className="w-full">
              <CarouselContent className="-ml-4">
                {filteredItems.map((item) => (
                  <CarouselItem key={item.id} className="pl-4 basis-full md:basis-1/2 lg:basis-1/3">
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
          </div>
        )}
      </div>
    </div>
  );
}