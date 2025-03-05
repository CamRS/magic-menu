import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Camera, Upload, Search, LogOut, ChevronDown, ChevronUp, Settings } from "lucide-react";
import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { SettingsMenu } from "@/components/settings-dialogs";

type AllergenType = 'milk' | 'eggs' | 'peanuts' | 'nuts' | 'shellfish' | 'fish' | 'soy' | 'gluten';
const allergensList: AllergenType[] = ['milk', 'eggs', 'peanuts', 'nuts', 'shellfish', 'fish', 'soy', 'gluten'];

const dietaryPreferences = ['Vegetarian', 'Vegan'] as const;

const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English" },
  { code: "es", name: "Español" },
  { code: "fr", name: "Français" },
  { code: "de", name: "Deutsch" },
  { code: "it", name: "Italiano" },
  { code: "ja", name: "日本語" },
  { code: "ko", name: "한국어" },
  { code: "zh", name: "中文" },
];

export default function ConsumerHomePage() {
  const { user, logoutMutation } = useAuth();
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

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Menu Explorer',
          text: 'Translate any menu, save your dietary preferences, and identify potential allergens on any menu.',
          url: window.location.href
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white border-b z-50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-900">Menu Explorer</h1>
            <Menubar>
              <MenubarMenu>
                <MenubarTrigger>
                  <Settings className="h-5 w-5" />
                </MenubarTrigger>
                <MenubarContent className="w-[400px] p-0" align="end">
                  <SettingsMenu />
                </MenubarContent>
              </MenubarMenu>
            </Menubar>
          </div>

          {/* Search and Filters */}
          <div className="space-y-3">
            <div className="relative">
              <Input
                placeholder="Search menu..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 h-11 rounded-full"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            </div>

            <div className="flex gap-2">
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
            </div>
          </div>

          {/* Collapsible Filters */}
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
        </div>
      </header>

      {/* Menu Actions */}
      <main className="pt-[180px] px-4 pb-20 max-w-4xl mx-auto">
        <div className="space-y-4">
          <Card className="p-8 text-center cursor-pointer hover:bg-accent/50 transition-colors">
            <div className="flex flex-col items-center space-y-4">
              <Camera className="h-12 w-12 text-primary" />
              <div className="text-lg font-medium">Snap a photo of a menu</div>
            </div>
          </Card>

          <Card className="p-8 text-center cursor-pointer hover:bg-accent/50 transition-colors">
            <label className="cursor-pointer">
              <div className="flex flex-col items-center space-y-4">
                <Upload className="h-12 w-12 text-primary" />
                <div className="text-lg font-medium">Upload a menu image</div>
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

        {/* User Greeting and Logout */}
        <div className="absolute bottom-4 left-4 flex items-center space-x-4">
          <h2 className="text-lg font-medium">Hi {user?.email?.split('@')[0]}!</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </main>
    </div>
  );
}