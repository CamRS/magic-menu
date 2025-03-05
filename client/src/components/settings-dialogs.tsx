import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

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

type SettingDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'language' | 'allergies' | 'account';
  currentLanguage?: string;
  currentEmail?: string;
};

export function SettingDialog({ open, onOpenChange, type, currentLanguage, currentEmail }: SettingDialogProps) {
  const { toast } = useToast();
  const [email, setEmail] = useState(currentEmail || '');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [language, setLanguage] = useState(currentLanguage || 'en');

  const handleSave = async () => {
    try {
      // TODO: Implement actual API calls to update settings
      toast({
        title: "Settings updated",
        description: "Your changes have been saved successfully.",
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {type === 'language' && 'Language Settings'}
            {type === 'allergies' && 'Allergy Settings'}
            {type === 'account' && 'Account Settings'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {type === 'language' && (
            <div className="space-y-2">
              <Label>Preferred Language</Label>
              <Select value={language} onValueChange={setLanguage}>
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
            </div>
          )}

          {type === 'account' && (
            <>
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Current Password</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
            </>
          )}

          <Button onClick={handleSave} className="w-full">
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
