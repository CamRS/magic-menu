import { useState } from "react";
import { Check, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

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

export function SettingsMenu() {
  const [showLanguageDialog, setShowLanguageDialog] = useState(false);
  const [showAllergyDialog, setShowAllergyDialog] = useState(false);
  const [showAccountDialog, setShowAccountDialog] = useState(false);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full">
          <User className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="w-full p-0">
        <div className="space-y-4 p-6">
          <div className="space-y-6">
            {/* Refer a friend */}
            <div className="flex justify-between items-center py-4">
              <div>
                <h3 className="text-base font-semibold">Refer a friend</h3>
                <p className="text-sm text-gray-600">
                  Translate any many, save your dietary preferences, and identify potential allergens on any menu.
                </p>
              </div>
              <Button className="bg-[#4F46E5] text-white hover:bg-[#4338CA]">
                Share
              </Button>
            </div>

            {/* Preferred language */}
            <div className="border-t" />
            <div className="flex justify-between items-center py-2">
              <div>
                <h3 className="text-base font-semibold">Preferred language</h3>
                <p className="text-base">English</p>
              </div>
              <Check className="h-5 w-5 text-[#4F46E5]" />
            </div>

            {/* Saved allergies */}
            <div className="border-t" />
            <div className="flex justify-between items-center py-2">
              <div>
                <h3 className="text-base font-semibold">Saved allergies</h3>
                <p className="text-base">Dairy</p>
              </div>
              <Check className="h-5 w-5 text-[#4F46E5]" />
            </div>

            {/* Account settings */}
            <div className="border-t" />
            <div className="space-y-4 py-2">
              <h3 className="text-base font-semibold">Account settings</h3>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">Email address</p>
                <p className="text-base">stevelucasroberts@gmail.com</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">Password</p>
                <p className="text-base">****************</p>
              </div>
              <Button variant="link" className="text-[#4F46E5] p-0 h-auto font-normal">
                Update login details
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}