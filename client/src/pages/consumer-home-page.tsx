import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Camera, Upload, ChevronDown, ChevronUp, Plus, Loader2 } from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import { SettingsMenu } from "@/components/settings-dialogs";
import { Badge } from "@/components/ui/badge";
import useEmblaCarousel, { EmblaCarouselType } from 'embla-carousel-react';
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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type ConsumerMenuItem } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

const ITEMS_PER_PAGE = 9;

type AllergenType = keyof ConsumerMenuItem['allergens'];
const allergensList: AllergenType[] = ['milk', 'eggs', 'peanuts', 'nuts', 'shellfish', 'fish', 'soy', 'gluten'];

const dietaryPreferences = ['Vegetarian', 'Vegan'] as const;

const MenuItemSkeleton = () => (
  <Card className="flex-[0_0_90%] sm:flex-[0_0_45%] lg:flex-[0_0_30%] mx-2 bg-white rounded-xl shadow-sm border border-gray-100">
    <CardContent className="p-6 space-y-4">
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-16" />
      </div>
      <Skeleton className="h-8 w-24" />
    </CardContent>
  </Card>
);

const MenuCard = ({ item }: { item: ConsumerMenuItem }) => {
  const activeAllergens = Object.entries(item.allergens)
    .filter(([_, value]) => value)
    .map(([key]) => key);

  const courseTag = item.courseTags?.[0] || '';

  return (
    <Card className="flex-[0_0_90%] sm:flex-[0_0_45%] lg:flex-[0_0_30%] mx-2 bg-white rounded-3xl shadow-sm border border-gray-100">
      <CardContent className="p-8 flex flex-col gap-4">
        {/* Course Type */}
        {courseTag && (
          <div className="text-gray-600 text-sm">
            {courseTag}
          </div>
        )}

        {/* Title */}
        <div>
          <h3 className="text-2xl leading-tight font-normal text-gray-900">
            {item.name}
          </h3>
          {item.name_original && (
            <div className="text-sm text-gray-600 mt-1">
              {item.name_original}
            </div>
          )}
        </div>

        {/* Allergens */}
        {activeAllergens.length > 0 && (
          <div>
            <div className="flex items-center gap-3">
              <span className="text-sm">Contains</span>
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

        {/* Description */}
        {item.description && (
          <p className="text-gray-900 text-sm leading-relaxed">
            {item.description}
          </p>
        )}

        {/* Price */}
        <div>
          <span className="text-xl font-normal text-gray-900">
            {item.price && parseFloat(item.price) > 0 ? `$${parseFloat(item.price).toFixed(2)}` : ''}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default function ConsumerHomePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAllergens, setSelectedAllergens] = useState<AllergenType[]>([]);
  const [selectedDietary, setSelectedDietary] = useState<typeof dietaryPreferences[number][]>([]);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isCoursesOpen, setIsCoursesOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [page, setPage] = useState(1);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
    dragFree: true,
    slidesToScroll: 1
  });

  useEffect(() => {
    if (emblaApi) {
      emblaApi.reInit();
    }
  }, [emblaApi]);

  const { data: menuItemsResponse, isLoading } = useQuery<{ items: ConsumerMenuItem[], total: number }>({
    queryKey: ["/api/consumer-menu-items", page, searchTerm, selectedAllergens, selectedTags],
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        page: page.toString(),
        searchTerm: searchTerm,
        selectedAllergens: selectedAllergens.join(','),
        selectedTags: selectedTags.join(',')
      });

      const response = await fetch(`/api/consumer-menu-items?${searchParams.toString()}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      return data;
    },
    enabled: !!user?.id,
  });

  const menuItems = menuItemsResponse?.items ?? [];
  const totalItems = menuItemsResponse?.total ?? 0;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/consumer-menu-items/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload menu');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/consumer-menu-items"] });
      toast({
        title: "Success",
        description: "Menu uploaded successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await uploadMutation.mutate(file);
    }
  };

  const handleCameraCapture = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await uploadMutation.mutate(file);
    }
  };

  const uniqueTags = menuItems?.reduce((tags, item) => {
    if (item.courseTags && item.courseTags.length > 0) tags.add(item.courseTags[0]);
    return tags;
  }, new Set<string>()) || new Set<string>();

  const handleTagSelection = (value: string) => {
    if (value === "all") {
      setSelectedTags([]);
    } else {
      const tags = value.split(",").filter(Boolean);
      setSelectedTags(tags);
    }
    setPage(1); 
  };

  const handleCoursesOpenChange = (open: boolean) => {
    setIsCoursesOpen(open);
    if (open) {
      setIsFiltersOpen(false);
    }
  };

  const handleFiltersOpenChange = (open: boolean) => {
    setIsFiltersOpen(open);
    if (open) {
      setIsCoursesOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="fixed top-0 left-0 right-0 bg-white border-b z-50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="relative">
            <Input
              placeholder="Search menu..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 h-11 rounded-full border-gray-200 bg-white"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          </div>

          <div className="flex gap-2 mt-3">
            <Button
              variant="outline"
              onClick={() => handleFiltersOpenChange(!isFiltersOpen)}
              className="flex-1 justify-between gap-2 h-10 px-4 py-2"
            >
              Filters
              {isFiltersOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>

            <Select
              value={selectedTags.length === 0 ? "all" : selectedTags.join(",")}
              onValueChange={handleTagSelection}
              open={isCoursesOpen}
              onOpenChange={handleCoursesOpenChange}
            >
              <SelectTrigger className="flex-1 h-10 px-4 py-2">
                <SelectValue placeholder="All Courses" />
              </SelectTrigger>
              <SelectContent className="w-full min-w-[200px]">
                <SelectItem value="all">All Courses</SelectItem>
                {Array.from(uniqueTags).map((tag) => (
                  <SelectItem key={tag} value={tag}>
                    {tag}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Collapsible 
            open={isFiltersOpen} 
            onOpenChange={handleFiltersOpenChange}
          >
            <CollapsibleContent className="py-4 space-y-4">
              <div>
                <h3 className="font-medium mb-2">Allergens</h3>
                <div className="grid grid-cols-2 gap-2">
                  {allergensList.map((allergen) => (
                    <Button
                      key={allergen}
                      variant="outline"
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
                        setPage(1);
                        setIsFiltersOpen(false); // Close dropdown after selection
                      }}
                    >
                      <span className="capitalize">{allergen}</span>
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-2">Dietary Preferences</h3>
                <div className="grid grid-cols-2 gap-2">
                  {dietaryPreferences.map((pref) => (
                    <Button
                      key={pref}
                      variant="outline"
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
                        setPage(1);
                        setIsFiltersOpen(false); // Close dropdown after selection
                      }}
                    >
                      {pref}
                    </Button>
                  ))}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </header>

      <main className={`pt-[180px] px-4 pb-20 max-w-4xl mx-auto`}>
        {isLoading ? (
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex">
              {Array.from({ length: ITEMS_PER_PAGE }).map((_, index) => (
                <MenuItemSkeleton key={index} />
              ))}
            </div>
          </div>
        ) : !menuItems || menuItems.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No menu items found
          </div>
        ) : (
          <>
            <div className="overflow-hidden" ref={emblaRef}>
              <div className="flex">
                {menuItems.map((item) => (
                  <MenuCard key={item.id} item={item} />
                ))}
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="flex items-center px-4 text-sm">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 py-2 px-6 z-50">
        <div className="max-w-3xl mx-auto">
          <div className="grid grid-cols-3 gap-4">
            <label className="flex flex-col items-center justify-center cursor-pointer">
              <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center mb-1 transition-colors group-hover:bg-gray-100">
                <Upload className="h-5 w-5 text-gray-600 group-hover:text-[#4F46E5]" />
              </div>
              <span className="text-xs font-medium text-gray-600 group-hover:text-[#4F46E5]">Upload Menu</span>
              <Input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </label>

            <label className="flex flex-col items-center justify-center cursor-pointer">
              <div className="w-12 h-12 rounded-full bg-[#4F46E5] flex items-center justify-center mb-1">
                {uploadMutation.isPending ? (
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                ) : (
                  <Camera className="h-6 w-6 text-white" />
                )}
              </div>
              <span className="text-xs font-medium text-gray-600">
                {uploadMutation.isPending ? 'Uploading...' : 'Take Photo'}
              </span>
              <Input
                type="file"
                accept="image/*"
                capture="user"
                className="hidden"
                onChange={handleCameraCapture}
                disabled={uploadMutation.isPending}
              />
            </label>

            <div className="flex flex-col items-center justify-center">
              <SettingsMenu />
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
}