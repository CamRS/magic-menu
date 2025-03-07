import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { type MenuItem, type InsertMenuItem, insertMenuItemSchema } from "@shared/schema";
import { 
  Share2, Download, Upload, Filter, Settings, Maximize2, 
  ChevronRight, Search, Eye, EyeOff, Trash2, Pencil, X, Loader2 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

type MenuItemStatus = "draft" | "live";
type AllergenType = keyof MenuItem['allergens'];

interface AllergenInfo {
  milk: boolean;
  eggs: boolean;
  peanuts: boolean;
  nuts: boolean;
  shellfish: boolean;
  fish: boolean;
  soy: boolean;
  gluten: boolean;
}

export default function MenuPage() {
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<MenuItem | null>(null);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [newTag, setNewTag] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showLabels, setShowLabels] = useState(false);
  const [statusFilter, setStatusFilter] = useState<MenuItemStatus | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [location] = useLocation();
  const { toast } = useToast();

  const restaurantId = new URLSearchParams(location.split('?')[1]).get('restaurantId');

  const form = useForm<InsertMenuItem>({
    resolver: zodResolver(insertMenuItemSchema),
    defaultValues: {
      name: "",
      description: "",
      price: "",
      courseTags: [],
      allergens: {
        milk: false,
        eggs: false,
        peanuts: false,
        nuts: false,
        shellfish: false,
        fish: false,
        soy: false,
        gluten: false,
      },
      image: "",
      status: "draft",
    },
  });

  // Query for fetching menu items
  const { data: menuItems, isLoading } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu-items", restaurantId, statusFilter, searchTerm],
    queryFn: async () => {
      if (!restaurantId) return [];
      const url = `/api/menu-items?${new URLSearchParams({
        restaurantId,
        ...(statusFilter && { status: statusFilter }),
        ...(searchTerm && { search: searchTerm }),
      })}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch menu items');
      return response.json();
    },
    enabled: !!restaurantId,
  });

  // Group menu items by status
  const groupedItems = menuItems?.reduce((acc, item) => {
    const status = item.status || "draft";
    if (!acc[status]) acc[status] = [];
    acc[status].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>) || {};

  const handleSubmit = async (data: InsertMenuItem) => {
    try {
      if (editItem) {
        await apiRequest(`/api/menu-items/${editItem.id}`, {
          method: "PATCH",
          body: data,
        });
        toast({
          title: "Menu item updated",
        });
      } else {
        await apiRequest("/api/menu-items", {
          method: "POST",
          body: { ...data, restaurantId },
        });
        toast({
          title: "Menu item created",
        });
      }
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items"] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save menu item",
        variant: "destructive",
      });
    }
  };

  // Export to CSV functionality
  const handleExportCSV = () => {
    if (!menuItems?.length) return;
    // Implementation for CSV export...
  };

  // Import from CSV functionality
  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    // Implementation for CSV import...
  };

  if (!restaurantId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Please select a restaurant first</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-custom-gray-100" 
      style={backgroundImage ? {
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      } : {}}
    >
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-custom-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Left Section */}
            <div className="flex items-center space-x-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full"
                      onClick={() => setShowLabels(!showLabels)}
                    >
                      <ChevronRight className={`h-5 w-5 transition-transform ${showLabels ? 'rotate-180' : ''}`} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Toggle Labels</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Center Icons */}
            <div className="flex items-center space-x-4">
              <TooltipProvider>
                {[
                  { icon: Share2, label: "Share Menu" },
                  { icon: Download, label: "Export CSV", onClick: handleExportCSV },
                  { 
                    icon: Upload, 
                    label: "Import CSV",
                    input: {
                      type: "file",
                      accept: ".csv",
                      onChange: handleImportCSV,
                    }
                  },
                  { icon: Filter, label: "Filter Menu" }
                ].map(({ icon: Icon, label, onClick, input }) => (
                  <Tooltip key={label}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="relative rounded-full"
                        onClick={onClick}
                      >
                        {input && (
                          <input
                            {...input}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                        )}
                        <Icon className="h-5 w-5" />
                        {showLabels && (
                          <span className="ml-2 text-sm">{label}</span>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{label}</TooltipContent>
                  </Tooltip>
                ))}
              </TooltipProvider>
            </div>

            {/* Right Icons */}
            <div className="flex items-center space-x-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full"
                      onClick={() => setSettingsOpen(true)}
                    >
                      <Settings className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Settings</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full"
                    >
                      <Maximize2 className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Fullscreen</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-custom-gray-400" />
          <Input
            placeholder="Search the menu"
            className="pl-12 h-12 rounded-3xl border-custom-gray-200 bg-white shadow-sm w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-3 mb-6">
          <Button
            variant={statusFilter === null ? "default" : "outline"}
            className={`filter-tab ${statusFilter === null ? 'filter-tab-active' : 'filter-tab-inactive'}`}
            onClick={() => setStatusFilter(null)}
          >
            All Items
          </Button>
          <Button
            variant={statusFilter === "draft" ? "default" : "outline"}
            className={`filter-tab ${statusFilter === "draft" ? 'filter-tab-active' : 'filter-tab-inactive'}`}
            onClick={() => setStatusFilter("draft")}
          >
            Drafts
          </Button>
          <Button
            variant={statusFilter === "live" ? "default" : "outline"}
            className={`filter-tab ${statusFilter === "live" ? 'filter-tab-active' : 'filter-tab-inactive'}`}
            onClick={() => setStatusFilter("live")}
          >
            Live
          </Button>

          {/* Add Item Button */}
          <Dialog 
            open={open} 
            onOpenChange={(isOpen) => {
              setOpen(isOpen);
              if (!isOpen) {
                setEditItem(null);
                form.reset();
              }
            }}
          >
            <DialogTrigger asChild>
              <Button className="filter-tab filter-tab-active ml-auto">
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editItem ? "Edit Menu Item" : "Add Menu Item"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                {/* Form fields here */}
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Menu Items Grid */}
        {Object.entries(groupedItems).map(([status, items]) => (
          <div key={status} className="mb-8">
            <h2 className="text-xl font-semibold text-custom-gray-500 mb-4 capitalize">
              {status} Items ({items.length})
            </h2>
            <div className="space-y-4">
              {items.map((item) => (
                <Card key={item.id} className="menu-card">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-6">
                      {/* Menu item content */}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </main>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Settings content */}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
