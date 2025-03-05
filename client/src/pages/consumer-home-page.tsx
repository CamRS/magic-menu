import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Camera, Upload } from "lucide-react";
import { useState } from "react";
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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // TODO: Handle file upload and processing
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50/50 to-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-b border-gray-100 z-50">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-semibold bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] bg-clip-text text-transparent">
              Menu Explorer
            </h1>
            <SettingsMenu />
          </div>

          {/* Search Bar Only */}
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
        </div>
      </header>

      {/* Menu Actions */}
      <main className="pt-[110px] px-4 pb-16 max-w-3xl mx-auto">
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
      </main>
    </div>
  );
}