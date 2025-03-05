import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Camera, Upload, Search, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { SettingsMenu } from "@/components/settings-dialogs";

type AllergenType = 'milk' | 'eggs' | 'peanuts' | 'nuts' | 'shellfish' | 'fish' | 'soy' | 'gluten';
const allergensList: AllergenType[] = ['milk', 'eggs', 'peanuts', 'nuts', 'shellfish', 'fish', 'soy', 'gluten'];

const dietaryPreferences = ['Vegetarian', 'Vegan'] as const;

export default function ConsumerHomePage() {
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAllergens, setSelectedAllergens] = useState<AllergenType[]>([]);
  const [selectedDietary, setSelectedDietary] = useState<typeof dietaryPreferences[number][]>([]);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // TODO: Handle file upload and processing
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white shadow-sm z-50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] bg-clip-text text-transparent">
              Menu Explorer
            </h1>
          </div>

          {/* Search and Filters */}
          <div className="space-y-3">
            <div className="relative">
              <Input
                placeholder="Search menu..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 h-12 rounded-xl border-gray-200 focus:border-[#4F46E5] focus:ring-[#4F46E5] transition-all duration-200"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                className="flex-1 justify-between gap-2 h-12 rounded-xl border-gray-200 hover:bg-gray-50 transition-all duration-200"
              >
                Filters
                {isFiltersOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Collapsible Filters */}
          <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
            <CollapsibleContent className="py-4 space-y-4">
              <div>
                <h3 className="font-medium mb-2 text-gray-700">Allergens</h3>
                <div className="grid grid-cols-2 gap-2">
                  {allergensList.map((allergen) => (
                    <Button
                      key={allergen}
                      variant="outline"
                      className={`justify-start gap-2 rounded-xl ${
                        selectedAllergens.includes(allergen)
                          ? "bg-[#4F46E5]/10 text-[#4F46E5] border-[#4F46E5]/20"
                          : "hover:bg-gray-50"
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
                <h3 className="font-medium mb-2 text-gray-700">Dietary Preferences</h3>
                <div className="grid grid-cols-2 gap-2">
                  {dietaryPreferences.map((pref) => (
                    <Button
                      key={pref}
                      variant="outline"
                      className={`justify-start gap-2 rounded-xl ${
                        selectedDietary.includes(pref)
                          ? "bg-[#4F46E5]/10 text-[#4F46E5] border-[#4F46E5]/20"
                          : "hover:bg-gray-50"
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
        </div>
      </header>

      {/* Menu Actions */}
      <main className="pt-[180px] px-4 pb-20 max-w-4xl mx-auto">
        <div className="space-y-4">
          <Card className="p-8 hover:shadow-lg transition-all duration-300 rounded-2xl cursor-pointer border-gray-200 bg-gradient-to-br from-white to-gray-50">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-[#4F46E5]/10 flex items-center justify-center">
                <Camera className="h-8 w-8 text-[#4F46E5]" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Snap a photo of a menu</h3>
                <p className="text-sm text-gray-500">Take a photo of any menu to instantly digitize it</p>
              </div>
            </div>
          </Card>

          <Card className="p-8 hover:shadow-lg transition-all duration-300 rounded-2xl cursor-pointer border-gray-200 bg-gradient-to-br from-white to-gray-50">
            <label className="cursor-pointer">
              <div className="flex flex-col items-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-[#4F46E5]/10 flex items-center justify-center">
                  <Upload className="h-8 w-8 text-[#4F46E5]" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Upload a menu image</h3>
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

        {/* Settings Menu */}
        <div className="fixed bottom-4 right-4">
          <SettingsMenu />
        </div>

        {/* User Greeting */}
        <div className="fixed bottom-4 left-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-4 py-2">
            <h2 className="text-sm font-medium text-gray-700">
              Welcome, {user?.email?.split('@')[0]}!
            </h2>
          </div>
        </div>
      </main>
    </div>
  );
}