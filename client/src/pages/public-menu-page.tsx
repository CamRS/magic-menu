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
import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

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

export default function PublicMenuPage() {
  const [matches, params] = useRoute("/menu/:restaurantId");
  const restaurantId = params?.restaurantId ? parseInt(params.restaurantId) : null;
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [selectedAllergens, setSelectedAllergens] = useState<AllergenType[]>([]);
  const [isFiltersOpen, setIsFiltersOpen] = useState(true);
  const [cardOrder, setCardOrder] = useState<MenuItem[]>([]);

  const { data: restaurant, isLoading: isLoadingRestaurant } = useQuery<Restaurant>({
    queryKey: ["/api/restaurants", restaurantId],
    enabled: !!restaurantId,
  });

  const { data: menuItems, isLoading: isLoadingMenu } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu-items"],
    queryFn: async () => {
      const response = await fetch(`/api/menu-items?restaurantId=${restaurantId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch menu items');
      }
      return response.json();
    },
    enabled: !!restaurantId,
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

  // Update card order when filtered items change
  useEffect(() => {
    setCardOrder(filteredItems);
  }, [filteredItems]);

  const handleSwipe = (direction: number) => {
    if (cardOrder.length <= 1) return;

    setCardOrder(prev => {
      const newOrder = [...prev];
      const [removed] = newOrder.splice(0, 1);
      newOrder.push(removed);
      return newOrder;
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

  const MenuCard = ({ item, index }: { item: MenuItem; index: number }) => (
    <motion.div
      initial={{ scale: 0.8, y: 50, opacity: 0 }}
      animate={{ 
        scale: index === 0 ? 1 : 0.98 - index * 0.01,
        y: index === 0 ? 0 : 8 + index * 6,
        x: index === 0 ? 0 : 4 + index * 6,
        opacity: 1,
        zIndex: cardOrder.length - index
      }}
      exit={{ x: 300, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={(e, { offset }) => {
        if (Math.abs(offset.x) > 100) {
          handleSwipe(offset.x > 0 ? 1 : -1);
        }
      }}
      className="absolute w-full cursor-grab active:cursor-grabbing"
      style={{
        pointerEvents: index === 0 ? "auto" : "none"
      }}
    >
      <Card className="bg-gray-900 border-gray-800 overflow-hidden mx-4 my-2">
        <CardContent className="p-0">
          <img
            src={foodImages[item.id % foodImages.length]}
            alt={`${item.name} presentation`}
            className="w-full h-[400px] object-cover"
          />
          <div className="p-6 space-y-4">
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
  );

  return (
    <div className="min-h-screen bg-black pb-32">
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

        {/* Menu Items Card Stack */}
        <div className="w-full h-[calc(100vh-400px)] relative mb-64">
          {cardOrder.length === 0 ? (
            <div className="text-center py-8 text-[#FFFFFF]">
              No menu items match your filters
            </div>
          ) : (
            <div className="relative w-full h-full">
              <AnimatePresence initial={false} mode="popLayout">
                {cardOrder.map((item, index) => (
                  <MenuCard key={item.id} item={item} index={index} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}