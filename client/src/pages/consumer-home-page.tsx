import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Camera, Upload, ChevronDown, ChevronUp, Plus, Settings } from "lucide-react";
import { useState } from "react";
import { SettingsMenu } from "@/components/settings-dialogs";
import { Badge } from "@/components/ui/badge";
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

type AllergenType = keyof ConsumerMenuItem['allergens'];
const allergensList: AllergenType[] = ['milk', 'eggs', 'peanuts', 'nuts', 'shellfish', 'fish', 'soy', 'gluten'];

const dietaryPreferences = ['Vegetarian', 'Vegan'] as const;

const MenuCard = ({ item }: { item: ConsumerMenuItem }) => {
  const activeAllergens = Object.entries(item.allergens)
    .filter(([_, value]) => value)
    .map(([key]) => key);

  return (
    <Card className="w-full bg-white rounded-xl shadow-sm border border-gray-100 h-full">
      <div className="p-6">
        <div className="mb-4">
          <h3 className="text-xl font-semibold text-gray-900">
            {item.name}
          </h3>
          {item.name_original && (
            <div className="text-base text-gray-600 mt-1">
              {item.name_original}
            </div>
          )}
        </div>

        {item.description && (
          <p className="text-gray-700 mb-4 line-clamp-3">
            {item.description}
          </p>
        )}

        {activeAllergens.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              {activeAllergens.map((allergen) => (
                <Badge
                  key={allergen}
                  variant="secondary"
                  className="bg-[#4169E1]/10 text-[#4169E1] border-none rounded-full capitalize px-3 py-1 text-xs"
                >
                  {allergen}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="mt-auto pt-2">
          <span className="text-xl font-semibold text-gray-900">
            {item.price && parseFloat(item.price) > 0 ? `$${parseFloat(item.price).toFixed(2)}` : ''}
          </span>
        </div>
      </div>
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
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const { data: menuItems } = useQuery<ConsumerMenuItem[]>({
    queryKey: ["/api/consumer-menu-items"],
    enabled: !!user?.id,
  });

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

  const uniqueTags = menuItems?.reduce((tags, item) => {
    item.courseTags?.forEach(tag => tags.add(tag));
    return tags;
  }, new Set<string>()) || new Set<string>();

  const filteredItems = menuItems?.filter(({ name, description, courseTags, allergens }) => {
    const matchesSearch = !searchTerm ||
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTags = selectedTags.length === 0 ||
      selectedTags.every(tag => courseTags?.includes(tag));

    const matchesAllergens = selectedAllergens.every(allergen => !allergens[allergen]);

    return matchesSearch && matchesTags && matchesAllergens;
  });

  const handleTagSelection = (value: string) => {
    if (value === "all") {
      setSelectedTags([]);
    } else {
      const tags = value.split(",").filter(Boolean);
      setSelectedTags(tags);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50/50 to-white pb-20">
      <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-b border-gray-100 z-50">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-semibold bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] bg-clip-text text-transparent">
              Menu Explorer
            </h1>
            <SettingsMenu />
          </div>

          <div>
            <div className="relative">
              <Input
                placeholder="Search menu..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 h-10 rounded-lg border-gray-200 focus:border-[#4F46E5]/30 focus:ring-[#4F46E5]/20 transition-all duration-200 bg-white/80"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
          </div>

          {menuItems && menuItems.length > 0 && (
            <>
              <div className="flex gap-2 mt-3">
                <Button
                  variant="outline"
                  onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                  className="flex-1 justify-between gap-2"
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
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="All Courses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Courses</SelectItem>
                    {Array.from(uniqueTags).map((tag) => (
                      <SelectItem key={tag} value={tag}>
                        {tag}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
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
                          }}
                        >
                          {pref}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </>
          )}
        </div>
      </header>

      <main className="pt-[110px] px-4 pb-24 max-w-3xl mx-auto">
        {(!menuItems || menuItems.length === 0) && (
          <div className="grid gap-3">
            <Card className="p-6 hover:shadow-md transition-all duration-300 rounded-xl cursor-pointer border-gray-100 bg-gradient-to-br from-white to-gray-50/50 group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-[#4F46E5]/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Camera className="h-6 w-6 text-[#4F46E5]" />
                </div>
                <div>
                  <h3 className="text-base font-medium text-gray-900 mb-0.5">Snap a photo of a menu</h3>
                  <p className="text-sm text-gray-500">Take a photo of any menu to instantly digitize it</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 hover:shadow-md transition-all duration-300 rounded-xl cursor-pointer border-gray-100 bg-gradient-to-br from-white to-gray-50/50 group">
              <label className="cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-[#4F46E5]/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Upload className="h-6 w-6 text-[#4F46E5]" />
                  </div>
                  <div>
                    <h3 className="text-base font-medium text-gray-900 mb-0.5">Upload a menu image</h3>
                    <p className="text-sm text-gray-500">Select a menu photo from your device</p>
                  </div>
                </div>
                <Input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </label>
            </Card>
          </div>
        )}

        {menuItems && menuItems.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredItems?.map((item) => (
              <MenuCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 py-2 px-6 z-50">
        <div className="max-w-3xl mx-auto">
          <div className="flex justify-around items-center">
            <button
              className="flex flex-col items-center gap-1 text-gray-600 hover:text-[#4F46E5] transition-colors"
              onClick={() => {/* TODO: Implement camera capture */}}
            >
              <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center">
                <Camera className="h-5 w-5" />
              </div>
              <span className="text-xs font-medium">Take Photo</span>
            </button>

            <label className="flex flex-col items-center gap-1 text-gray-600 hover:text-[#4F46E5] transition-colors cursor-pointer">
              <div className="w-12 h-12 rounded-full bg-[#4F46E5] flex items-center justify-center -mt-4 shadow-lg">
                <Plus className="h-6 w-6 text-white" />
              </div>
              <span className="text-xs font-medium mt-1">Upload Menu</span>
              <Input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </label>

            <button
              className="flex flex-col items-center gap-1 text-gray-600 hover:text-[#4F46E5] transition-colors"
              onClick={() => document.querySelector<HTMLButtonElement>('[role="combobox"]')?.click()}
            >
              <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center">
                <Settings className="h-5 w-5" />
              </div>
              <span className="text-xs font-medium">Settings</span>
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
}