import { useState } from "react";
import { User, CheckIcon, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

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

const allergensList = ['milk', 'eggs', 'peanuts', 'nuts', 'shellfish', 'fish', 'soy', 'gluten'];

export function SettingsMenu() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUpdateLoginOpen, setIsUpdateLoginOpen] = useState(false);
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const [isAllergiesOpen, setIsAllergiesOpen] = useState(false);
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>(user?.savedAllergies ?? []);
  const [selectedLanguage, setSelectedLanguage] = useState(user?.preferredLanguage ?? 'en');
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

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

  const handleUpdateLanguage = async () => {
    try {
      await apiRequest('PATCH', '/api/user/preferences', {
        preferredLanguage: selectedLanguage
      });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      setIsLanguageOpen(false);
      toast({
        title: "Language updated",
        description: "Your preferred language has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update language preference.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateAllergies = async () => {
    try {
      await apiRequest('PATCH', '/api/user/preferences', {
        savedAllergies: selectedAllergies
      });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      setIsAllergiesOpen(false);
      toast({
        title: "Allergies updated",
        description: "Your allergy preferences have been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update allergy preferences.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateLogin = async () => {
    try {
      await apiRequest('PATCH', '/api/user', {
        email: newEmail || undefined,
        currentPassword,
        newPassword: newPassword || undefined,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      setIsUpdateLoginOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setNewEmail('');
      toast({
        title: "Account updated",
        description: "Your account details have been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update account details. Please check your current password.",
        variant: "destructive",
      });
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <div className="flex flex-col items-center gap-1 text-gray-600 hover:text-[#4F46E5] transition-colors">
          <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center">
            <User className="h-5 w-5" />
          </div>
          <span className="text-xs font-medium">Settings</span>
        </div>
      </SheetTrigger>
      <SheetContent side="bottom" className="w-full p-0">
        <div className="space-y-3 p-4">
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Refer a friend</h3>
                <p className="text-xs text-gray-500">
                  Translate any menu, save your dietary preferences, and identify potential allergens on any menu.
                </p>
              </div>
              <Button
                className="bg-[#4F46E5] text-white hover:bg-[#4338CA] text-sm px-4 py-2 h-8"
                onClick={handleShare}
              >
                Share
              </Button>
            </div>

            <div className="border-t border-gray-100" />
            <Dialog open={isLanguageOpen} onOpenChange={setIsLanguageOpen}>
              <DialogTrigger asChild>
                <div className="flex justify-between items-center py-2 cursor-pointer">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Preferred language</h3>
                    <p className="text-xs text-gray-500">
                      {SUPPORTED_LANGUAGES.find(lang => lang.code === (user?.preferredLanguage ?? 'en'))?.name ?? 'English'}
                    </p>
                  </div>
                  <CheckIcon className="h-4 w-4 text-[#4F46E5]" />
                </div>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Select Language</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a language" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleUpdateLanguage} className="w-full">
                    Save Language
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <div className="border-t border-gray-100" />
            <Dialog open={isAllergiesOpen} onOpenChange={setIsAllergiesOpen}>
              <DialogTrigger asChild>
                <div className="flex justify-between items-center py-2 cursor-pointer">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Saved allergies</h3>
                    <p className="text-xs text-gray-500">
                      {(user?.savedAllergies ?? []).length > 0
                        ? (user?.savedAllergies ?? []).map(a => a.charAt(0).toUpperCase() + a.slice(1)).join(', ')
                        : 'None selected'}
                    </p>
                  </div>
                  <CheckIcon className="h-4 w-4 text-[#4F46E5]" />
                </div>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Select Allergies</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-2">
                    {allergensList.map((allergen) => (
                      <Button
                        key={allergen}
                        variant="outline"
                        className={`justify-start gap-2 ${
                          selectedAllergies.includes(allergen)
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : ""
                        }`}
                        onClick={() => {
                          setSelectedAllergies((prev) =>
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
                  <Button onClick={handleUpdateAllergies} className="w-full">
                    Save Allergies
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <div className="border-t border-gray-100" />
            <Dialog open={isUpdateLoginOpen} onOpenChange={setIsUpdateLoginOpen}>
              <DialogTrigger asChild>
                <div className="space-y-2 py-2">
                  <h3 className="text-sm font-medium text-gray-900">Account settings</h3>
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500">Email address</p>
                    <p className="text-sm text-gray-700">{user?.email}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500">Password</p>
                    <p className="text-sm text-gray-700">****************</p>
                  </div>
                  <Button variant="link" className="text-[#4F46E5] p-0 h-auto text-xs" onClick={() => setIsUpdateLoginOpen(true)}>
                    Update login details
                  </Button>
                </div>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Update Account</DialogTitle>
                  <DialogDescription>
                    Update your email address or password. Leave fields blank to keep current values.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>New Email (optional)</Label>
                    <Input
                      type="email"
                      placeholder={user?.email}
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Current Password</Label>
                    <Input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>New Password (optional)</Label>
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleUpdateLogin} className="w-full">
                    Update Account
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <div className="border-t border-gray-100" />
            <Button 
              variant="ghost" 
              className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 text-sm gap-2 justify-start"
              onClick={() => logoutMutation.mutate()}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}