import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Camera, Upload, Search, LogOut } from "lucide-react";
import { useState } from "react";

export default function ConsumerHomePage() {
  const { user, logoutMutation } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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

  return (
    <div className="container max-w-md mx-auto p-4 space-y-4">
      {/* Search and Filter Section */}
      <div className="flex space-x-2">
        <Button variant="outline" size="icon" className="rounded-full">
          <Search className="h-4 w-4" />
        </Button>
        <Button variant="outline" className="w-full justify-start">
          Filter by allergy
        </Button>
        <Button variant="outline" className="w-full justify-start">
          All items
        </Button>
      </div>

      <div className="text-center text-sm text-muted-foreground">
        Showing: All menu items
      </div>

      {/* Menu Actions */}
      <div className="space-y-4 pt-8">
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
    </div>
  );
}