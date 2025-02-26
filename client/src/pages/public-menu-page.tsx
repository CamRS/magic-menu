import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { type MenuItem, type Restaurant, courseTypes } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, Loader2, Search, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
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

export default function PublicMenuPage() {
  const [matches, params] = useRoute("/menu/:restaurantId");
  const restaurantId = params?.restaurantId ? parseInt(params.restaurantId) : null;
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [selectedAllergens, setSelectedAllergens] = useState<AllergenType[]>([]);
  const [isFiltersOpen, setIsFiltersOpen] = useState(true);
  const [items, setItems] = useState<MenuItem[]>([]);

  const { data: restaurant, isLoading: isLoadingRestaurant } = useQuery<Restaurant>({
    queryKey: ["/api/restaurants", restaurantId],
    enabled: !!restaurantId,
  });

  const { data: menuItems, isLoading: isLoadingMenu } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu-items", restaurantId],
    enabled: !!restaurantId,
    onSuccess: (data) => {
      console.log("Menu items loaded:", data);
      setItems(data);
    }
  });

  const filteredItems = useMemo(() => {
    if (!items) return [];

    return items.filter(item => {
      const matchesSearch = searchTerm === "" || 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCourse = selectedCourse === "all" || item.courseType === selectedCourse;

      const matchesAllergens = selectedAllergens.length === 0 || 
        !selectedAllergens.some(allergen => item.allergens[allergen]);

      return matchesSearch && matchesCourse && matchesAllergens;
    });
  }, [items, searchTerm, selectedCourse, selectedAllergens]);

  const handleDragEnd = (itemId: number) => {
    setItems(prevItems => {
      const itemIndex = prevItems.findIndex(item => item.id === itemId);
      if (itemIndex === -1) return prevItems;

      const item = prevItems[itemIndex];
      const newItems = prevItems.filter(i => i.id !== itemId);
      return [...newItems, item];
    });
  };

  if (!matches || !restaurantId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <p className="text-[#FFFFFF]">Restaurant not found</p>
      </div>
    );
  }

  if (isLoadingRestaurant || isLoadingMenu) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-[#FFFFFF]" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <p className="text-[#FFFFFF]">Restaurant not found</p>
      </div>
    );
  }

  console.log("Filtered items:", filteredItems);

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-6xl mx-auto p-4">
        {/* Restaurant Name */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-[#FFFFFF] mb-2">{restaurant?.name}</h1>
          <div className="h-1 w-24 bg-[#FFFFFF] mx-auto"></div>
        </div>

        {/* Menu Title */}
        <div className="mb-8">
          <h2 className="text-4xl font-bold text-[#FFFFFF]">Menu</h2>
        </div>

        {/* Filters Section */}
        <Collapsible
          open={isFiltersOpen}
          onOpenChange={setIsFiltersOpen}
          className="mb-8 space-y-4 bg-gray-900/50 p-4 rounded-xl"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-[#FFFFFF] text-xl font-semibold">Filters</h2>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="text-[#FFFFFF]">
                {isFiltersOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          </div>

          <CollapsibleContent className="space-y-6">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#FFFFFF]" />
              <Input
                placeholder="Search menu"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 py-6 bg-gray-900 border-gray-800 text-[#FFFFFF] placeholder:text-[#FFFFFF]/60 rounded-xl"
              />
            </div>

            {/* Allergen Filters */}
            <div>
              <p className="text-[#FFFFFF] mb-2">I'm allergic to</p>
              <div className="flex flex-wrap gap-2">
                {allergensList.map((allergen) => (
                  <Button
                    key={allergen}
                    variant={selectedAllergens.includes(allergen) ? "default" : "outline"}
                    className={`rounded-full ${
                      selectedAllergens.includes(allergen)
                        ? "bg-blue-600 text-[#FFFFFF]"
                        : "bg-gray-800 text-[#FFFFFF] hover:bg-gray-700"
                    }`}
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

            {selectedAllergens.length > 0 && (
              <div className="text-sm text-[#FFFFFF]">
                Showing options free of {selectedAllergens.join(', ')}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Menu Items */}
        <div className="relative w-full" style={{ height: '80vh' }}>
          {filteredItems.length === 0 ? (
            <div className="text-center py-8 text-[#FFFFFF]">
              No menu items match your filters
            </div>
          ) : (
            <AnimatePresence>
              {filteredItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  style={{
                    position: 'absolute',
                    width: '100%',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: filteredItems.length - index,
                  }}
                  initial={{ scale: 0.8, y: 100, opacity: 0 }}
                  animate={{ 
                    scale: 1, 
                    y: 0, 
                    opacity: 1,
                    transition: {
                      type: "spring",
                      stiffness: 300,
                      damping: 20,
                      delay: index * 0.1
                    }
                  }}
                  exit={{ x: -1000, opacity: 0 }}
                  drag="y"
                  dragConstraints={{ top: -100, bottom: 100 }}
                  dragElastic={0.8}
                  onDragEnd={(_, info) => {
                    if (Math.abs(info.offset.y) > 100) {
                      handleDragEnd(item.id);
                    }
                  }}
                  whileDrag={{ scale: 1.05 }}
                >
                  <Card className="bg-gray-900 border-gray-800 overflow-hidden transform hover:shadow-xl transition-shadow duration-200">
                    <CardContent className="p-6">
                      {item.image && (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-64 object-cover rounded-lg mb-4"
                        />
                      )}
                      <div className="space-y-4">
                        <div className="flex justify-between items-start">
                          <h3 className="text-2xl font-semibold text-[#FFFFFF]">{item.name}</h3>
                          <span className="text-2xl font-bold text-[#FFFFFF]">
                            ${parseFloat(item.price).toFixed(2)}
                          </span>
                        </div>
                        <p className="text-[#FFFFFF]/80 text-lg">
                          {item.description}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(item.allergens)
                            .filter(([_, value]) => value)
                            .map(([key]) => (
                              <Badge
                                key={key}
                                variant="outline"
                                className="bg-transparent border-[#FFFFFF]/20 text-[#FFFFFF]"
                              >
                                Contains {key}
                              </Badge>
                            ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}