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
import { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";

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
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [cardOrder, setCardOrder] = useState<MenuItem[]>([]);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });

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
      retry: 2, // Retry 2 times before failing
      staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    });

    if (error) {
      return <p className="text-red-500">Error loading menu items: {error.message}</p>;
    }


  const filteredItems = useMemo(() => {
    if (!menuItems) return [];

    const selectedAllergenSet = new Set(selectedAllergens);
    return menuItems.filter(({ name, description, courseType, allergens }) => {
      return (
        (!searchTerm || name.toLowerCase().includes(lowerSearch) || description.toLowerCase().includes(lowerSearch)) &&
        (selectedCourse === "all" || courseType === selectedCourse) &&
        !Object.keys(allergens).some((a) => selectedAllergenSet.has(a as AllergenType))
      );
    });
  }, [menuItems, searchTerm, selectedCourse, selectedAllergens]);


  // Update card order when filtered items change
  useEffect(() => {
    if (menuItems && cardOrder.length === 0) {
      setCardOrder([...menuItems]); // Ensures array reference consistency
    }
  }, [menuItems, cardOrder.length]);

  const handleSwipe = useCallback((direction: 'left' | 'right') => {
    setCardOrder((prev) => {
      if (!Array.isArray(prev) || prev.length === 0) return prev;

      if (direction === 'left') {
        return prev.slice(1);
      } else if (direction === 'right') {
        const lastItem = menuItems?.find(item => !prev.includes(item));
        return lastItem ? [lastItem, ...prev] : prev;
      }
      return prev;
    });
  }, []);

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
  // Updated MenuCard component
  const MenuCard = ({ item, index }: { item: MenuItem; index: number }) => {
    // Animation controls
    const controls = useAnimation();

    // State for tracking drag and animation
    const [dragInfo, setDragInfo] = useState<{ offset: { x: number, y: number }, velocity: { x: number, y: number } | null }>({ 
      offset: { x: 0, y: 0 }, 
      velocity: null 
    });
    const [isDragging, setIsDragging] = useState(false);

    // Calculate card stack position
    const scale = Math.max(0.85, 1 - index * 0.05); // Each card is 95% the size of the one above
    const translateY = index * 12;  // Ensures cards stack properly
    const opacity = Math.max(0.3, 1 - index * 0.12); // Prevents cards from fading out too much


    // Use useEffect to handle animation state changes
    useEffect(() => {
      // Initial animation - runs once on mount
      controls.start({
        opacity,
        scale,
        y: translateY, // ✅ Use vertical stacking instead
      
        transition: { 
          type: "spring",
          stiffness: 250,
          damping: 30,
          mass: 0.8
        }
      });
    }, [controls, index, opacity, scale,]);

    // Handle animations in response to drag events
    useEffect(() => {
      if (!isDragging && dragInfo.velocity) {
        const threshold = window.innerWidth * 0.15;
        const velocity = 10;

        if (dragInfo.offset.x > threshold || (dragInfo.velocity?.x && dragInfo.velocity.x > velocity)) {
          // Swipe right
          controls.start({
            x: window.innerWidth,
            transition: { duration: 0.3, ease: [0.32, 0.72, 0, 1] }
          }).then(() => handleSwipe('right'));
        } else if (dragInfo.offset.x < -threshold || (dragInfo.velocity?.x && dragInfo.velocity.x < -velocity)) {
          // Swipe left
          controls.start({
            x: -window.innerWidth,
            transition: { duration: 0.3, ease: [0.32, 0.72, 0, 1] }
          }).then(() => handleSwipe('left'));
        } else {
          // Return to center
          controls.start({
            x: 0,
            transition: { 
              type: "spring", 
              stiffness: 300, 
              damping: 20,
              restDelta: 0.5
            }
          });
        }

        // Reset drag info
        setDragInfo({ offset: { x: 0, y: 0 }, velocity: null });
      }
    }, [controls, dragInfo, isDragging, handleSwipe]);

    // Handle drag gesture
    const handleDrag = useCallback((_, info) => {
      requestAnimationFrame(() => {
        setDragPosition((prev) => ({
          x: prev.x !== info.offset.x ? info.offset.x : prev.x,
          y: 0
        }));
      });
    }, []);

    // Handle drag end
    const handleDragEnd = (_, info) => {
      setIsDragging(false);
      setDragInfo({
        offset: info.offset,
        velocity: info.velocity
      });

      // Reset drag position state
      setDragPosition({ x: 0, y: 0 });
    };

    return (
      <motion.div
        className="absolute w-full cursor-grab active:cursor-grabbing touch-none"
        style={{ zIndex: cardOrder.length - index }}
        initial={{ scale: scale, opacity: opacity, y: translateY, x: 0 }} // ✅ Now uses translateY
        animate={{
          scale: index === 0 ? 1 : scale,
          opacity: index === 0 ? 1 : opacity,
          y: translateY,
          x: 0,
        }}
        transition={{
          type: "spring",
          stiffness: 150, // Makes swipe feel natural
          damping: 15, // Reduces snap-back effect
        }}
        drag={index === 0 ? "x" : false} // Only the top card is draggable
        dragElastic={0.5} // Reduces stiffness when dragging
        dragMomentum={true} // Allows smooth momentum
      >

        {/* Visual feedback based on drag position */}
        {index === 0 && (
          <div 
            className="absolute inset-0 rounded-xl z-10 pointer-events-none transition-opacity duration-300"
            style={{
              backgroundColor: dragPosition.x > 50 ? 'rgba(0, 255, 0, 0.15)' : 
                             dragPosition.x < -50 ? 'rgba(255, 0, 0, 0.15)' : 
                             'transparent',
              opacity: Math.min(1, Math.abs(dragPosition.x) / 150)
            }}
          />
        )}

        {/* Card Content */}
        <Card className="bg-white rounded-xl overflow-hidden mx-2 my-1 shadow-lg max-w-sm w-80 mx-auto">
            <CardContent className="p-4 space-y-1">
            <div className="space-y-5">
              {/* Title */}
              <h3 className="text-2xl font-bold text-gray-900">{item.name}</h3>

              {/* Allergens */}
              <div className="flex flex-wrap gap-2 items-center mb-3">
                <span className="text-gray-700 mr-2 text-sm">Contains</span>
                {Object.entries(item.allergens)
                  .filter(([_, value]) => value)
                  .map(([key]) => (
                      <Badge
                        className="bg-blue-500 text-gray-800 hover:bg-blue-600 rounded-full px-2.5 py-1 text-xs"
                      >
                      {key}
                    </Badge>
                  ))}
              </div>

              {/* Image - adjusted height and aspect ratio */}
              <div className="mb-6">
                <img
                  src={foodImages[item.id % foodImages.length]}
                  alt={`${item.name} presentation`}
                  className="w-full h-56 object-cover rounded-lg"
                  draggable="false"
                />
              </div>

              {/* Description - smaller text */}
              <p className="text-gray-700 text-sm min-h-[3rem]">
                {item.description}
              </p>

              {/* Price */}
              <div>
                <span className="text-gray-500 text-xl font-semibold">
                  ${parseFloat(item.price).toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };
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
                 {["Gluten", "Dairy", "Eggs", "Peanuts", "Shellfish", "Fish", "Soy"].map((allergen) => {
                   const allergenKey = allergen.toLowerCase() as AllergenType;
                   return (
                     <Button
                       variant="outline"
                       className={`rounded-full text-xs px-3 py-1 h-auto
                         hover:bg-gray-400 hover:text-white
                         ${selectedAllergens.includes(allergenKey) 
                           ? "bg-blue-600 text-white" 
                           : "bg-gray-200 text-gray-800"}`}
                       onClick={() => {
                         setSelectedAllergens(prev =>
                           prev.includes(allergenKey)
                             ? prev.filter(a => a !== allergenKey)
                             : [...prev, allergenKey]
                         );
                       }}
                     >
                       {allergen}
                     </Button>
                   );
                 })}
               </div>
             </div>

             {/* Dietary Preferences Section */}
             <div className="text-center w-full max-w-md">
               <p className="text-gray-800 mb-3 font-medium">Dietary Preferences</p>
               <div className="flex flex-wrap gap-2 justify-center">
                 <Button
                   variant="outline"
                   className="rounded-full text-xs px-3 py-1 h-auto bg-gray-200 text-gray-800 hover:bg-gray-300"
                 >
                   Vegetarian
                 </Button>
                 <Button
                   variant="outline"
                   className="rounded-full text-xs px-3 py-1 h-auto bg-gray-200 text-gray-800 hover:bg-gray-300"
                 >
                   Vegan
                 </Button>
               </div>
             </div>
           </CollapsibleContent>
          </Collapsible>

          {/* Course Type Dropdown */}
          <div className="mb-8">
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
        
        {/* Menu Items Card Stack */}
            <div className="w-full h-[calc(100vh-280px)] relative mb-16">
          {cardOrder.length === 0 ? (
            <div className="text-center py-8 text-[#FFFFFF]">
              No menu items match your filters
            </div>
          ) : (
            <div className="relative w-full h-full touch-action-none">
              <AnimatePresence initial={false} mode="popLayout">
                {cardOrder.slice(0, 5).map((item, index) => (
                  <MenuCard key={item.id} item={item} index={index} />
                ))}
              </AnimatePresence>
            </div>
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