import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Share2,
  Download,
  Upload,
  Filter,
  Settings,
  ChevronRight,
  Search,
  Eye,
  EyeOff,
  Trash2,
  Pencil,
  Store,
  PlusCircle,
  ChevronDown,
  Loader2,
  Globe,
  Image as ImageIcon,
  QrCode,
  X,
  LogOut,
} from "lucide-react";
import { Reorder, motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  type Restaurant,
  type MenuItem,
  type InsertMenuItem,
  insertMenuItemSchema,
} from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { QRCodeSVG } from "qrcode.react";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/components/ui/tooltip";

type MenuItemStatus = "draft" | "live";

const defaultFormValues: InsertMenuItem = {
  name: "",
  name_original: "",
  description: "",
  price: "",
  courseTags: [],
  course_original: "",
  displayOrder: 0,
  restaurantId: 0,
  image: "",
  status: "draft",
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
  dietary_preferences: {
    vegan: false,
    vegetarian: false,
    kosher: false,
    halal: false,
  },
};

const MenuItemCard = ({ item, selectedItems, handleStatusChange, handleEdit, handleDelete, handleImageDrop, handleImageDelete, toggleItemSelection }: {
  item: MenuItem;
  selectedItems: number[];
  handleStatusChange: (item: MenuItem) => void;
  handleEdit: (item: MenuItem) => void;
  handleDelete: (id: number) => void;
  handleImageDrop: (e: React.DragEvent<HTMLDivElement>, id?: number) => void;
  handleImageDelete: (id: number) => void;
  toggleItemSelection: (id: number) => void;
}) => (
  <Card key={item.id} className="menu-card">
    <CardContent className="p-4">
      <div className="flex items-start gap-6">
        <Checkbox
          checked={selectedItems.includes(item.id)}
          onCheckedChange={() => toggleItemSelection(item.id)}
          className="mt-1"
        />

        <div
          className="w-32 h-32 flex-shrink-0 bg-custom-gray-100 rounded-lg flex items-center justify-center overflow-hidden transition-all duration-200 relative group"
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.currentTarget.classList.add('border-2', 'border-primary', 'border-dashed');
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.currentTarget.classList.remove('border-2', 'border-primary', 'border-dashed');
          }}
          onDrop={(e) => handleImageDrop(e, item.id)}
        >
          {item.image ? (
            <>
              <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  handleImageDelete(item.id);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <div className="text-center text-custom-gray-400 text-sm">
              <Upload className="h-6 w-6 mx-auto mb-1" />
              <span>Upload Image</span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <div className="flex-1 mr-4">
              <h3 className="text-lg font-medium text-custom-gray-500">
                {item.name}
              </h3>
              <p className="text-custom-gray-400 mt-1">
                {item.description}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-lg font-medium text-custom-gray-500 mr-4">
                {item.price ? `$${parseFloat(item.price).toFixed(2)}` : ""}
              </span>
              <Badge variant={item.status === "live" ? "default" : "secondary"} className="rounded-full px-3 py-1">
                {item.status}
              </Badge>
              <TooltipProvider>
                {[
                  {
                    icon: item.status === "draft" ? Eye : EyeOff,
                    label: item.status === "draft" ? "Make Live" : "Make Draft",
                    onClick: () => handleStatusChange(item),
                  },
                  { icon: Pencil, label: "Edit", onClick: () => handleEdit(item) },
                  { icon: Trash2, label: "Delete", onClick: () => handleDelete(item.id) },
                ].map(({ icon: Icon, label, onClick }) => (
                  <Tooltip key={label}>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="rounded-full" onClick={onClick}>
                        <Icon className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{label}</TooltipContent>
                  </Tooltip>
                ))}
              </TooltipProvider>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            {Object.entries(item.allergens)
              .filter(([_, value]) => value)
              .map(([key]) => (
                <Badge
                  key={key}
                  variant="outline"
                  className="rounded-full bg-custom-gray-100 text-custom-gray-400 border-none px-3"
                >
                  Contains {key}
                </Badge>
              ))}
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

function MenuSection({ section, items, selectedItems, handleStatusChange, handleEdit, handleDelete, handleImageDrop, handleImageDelete, toggleItemSelection }: {
  section: string;
  items: MenuItem[];
  selectedItems: number[];
  handleStatusChange: (item: MenuItem) => void;
  handleEdit: (item: MenuItem) => void;
  handleDelete: (id: number) => void;
  handleImageDrop: (e: React.DragEvent<HTMLDivElement>, id?: number) => void;
  handleImageDelete: (id: number) => void;
  toggleItemSelection: (id: number) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <motion.div layout className="mb-8">
      <div
        className="flex items-center gap-2 mb-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <motion.div
          animate={{ rotate: isExpanded ? 90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronRight className="h-5 w-5" />
        </motion.div>
        <h2 className="text-xl font-semibold">{section}</h2>
        <span className="text-custom-gray-400">({items.length})</span>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Reorder.Group
              axis="y"
              values={items}
              onReorder={items}
              className="space-y-4"
            >
              {items.map((item) => (
                <Reorder.Item
                  key={item.id}
                  value={item}
                  dragListener
                  className="cursor-move touch-none"
                  whileDrag={{
                    scale: 1.1,
                    boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                    zIndex: 50,
                  }}
                  dragTransition={{
                    bounceStiffness: 300,
                    bounceDamping: 20
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 200,
                    damping: 20
                  }}
                >
                  <MenuItemCard
                    item={item}
                    selectedItems={selectedItems}
                    handleStatusChange={handleStatusChange}
                    handleEdit={handleEdit}
                    handleDelete={handleDelete}
                    handleImageDrop={handleImageDrop}
                    handleImageDelete={handleImageDelete}
                    toggleItemSelection={toggleItemSelection}
                  />
                </Reorder.Item>
              ))}
            </Reorder.Group>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function HomePage() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [isCreateMenuItemOpen, setCreateMenuItemOpen] = useState(false);
  const [isCreateRestaurantOpen, setCreateRestaurantOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [showQrCode, setShowQrCode] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<MenuItemStatus | null>(null);
  const [newTag, setNewTag] = useState("");
  const [showLabels, setShowLabels] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [isUpdateLoginOpen, setIsUpdateLoginOpen] = useState(false); 
  const [newEmail, setNewEmail] = useState(""); 
  const [currentPassword, setCurrentPassword] = useState(""); 
  const [newPassword, setNewPassword] = useState(""); 
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qrCodeRef = useRef<HTMLDivElement>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<InsertMenuItem>({
    resolver: zodResolver(insertMenuItemSchema),
    defaultValues: {
      name: "",
      name_original: "",
      description: "",
      price: "",
      courseTags: [],
      course_original: "",
      displayOrder: 0,
      restaurantId: selectedRestaurant?.id || 0,
      image: "",
      status: "draft",
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
      dietary_preferences: {
        vegan: false,
        vegetarian: false,
        kosher: false,
        halal: false,
      },
    },
  });

  const { data: restaurants, isLoading: isLoadingRestaurants } = useQuery<Restaurant[]>({
    queryKey: ["/api/restaurants"],
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (restaurants?.length && !selectedRestaurant) {
      setSelectedRestaurant(restaurants[0]);
      form.setValue("restaurantId", restaurants[0].id);
    }
  }, [restaurants, selectedRestaurant, form]);

  const { data: menuItems, isLoading: isLoadingMenuItems } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu-items", selectedRestaurant?.id],
    queryFn: async () => {
      if (!selectedRestaurant?.id) return [];
      console.log("Fetching menu items for restaurant:", selectedRestaurant.id);

      const response = await apiRequest("GET", `/api/menu-items?restaurantId=${selectedRestaurant.id}`);
      if (!response.ok) {
        console.error("Failed to fetch menu items:", await response.text());
        throw new Error("Failed to fetch menu items");
      }
      const items = await response.json();
      console.log("Fetched menu items:", items);
      return items;
    },
    enabled: !!selectedRestaurant?.id && !!user?.id,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  });

  const groupedItems =  menuItems?.reduce(
    (acc, item) => {
      const status = item.status || "draft";
      if (searchTerm && !item.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !item.description.toLowerCase().includes(searchTerm.toLowerCase())) {
        return acc;
      }

      if (statusFilter && item.status !== statusFilter) {
        return acc;
      }
      acc[status as MenuItemStatus].push(item);
      return acc;
    },
    { draft: [], live: [] } as Record<MenuItemStatus, MenuItem[]>
  ) || { draft: [], live: [] };

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: MenuItemStatus }) => {
      const response = await apiRequest("PATCH", `/api/menu-items/${id}/status`, { status });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update status");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items", selectedRestaurant?.id] });
      toast({
        title: "Success",
        description: "Item status updated successfully",
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

  const createMutation = useMutation({
    mutationFn: async (data: InsertMenuItem) => {
      if (!selectedRestaurant?.id) {
        throw new Error("No restaurant selected");
      }

      const response = await apiRequest("POST", "/api/menu-items", {
        ...data,
        restaurantId: selectedRestaurant.id,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create menu item");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items", selectedRestaurant?.id] });
      setCreateMenuItemOpen(false);
      form.reset({
        ...form.getValues(),
        restaurantId: selectedRestaurant?.id || 0,
      });
      toast({
        title: "Success",
        description: "Menu item created successfully",
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

  const handleSubmit = async (data: InsertMenuItem) => {
    if (!selectedRestaurant?.id) {
      toast({
        title: "Error",
        description: "Please select a restaurant first",
        variant: "destructive",
      });
      return;
    }

    if (editingItem) {
      const response = await apiRequest("PATCH", `/api/menu-items/${editingItem.id}`, {
        ...data,
        restaurantId: selectedRestaurant.id,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update menu item");
      }
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items", selectedRestaurant.id] });
      setCreateMenuItemOpen(false);
      setEditingItem(null);
      form.reset();
      toast({
        title: "Success",
        description: "Menu item updated successfully",
      });
    } else {
      createMutation.mutate({ ...data, restaurantId: selectedRestaurant.id });
    }
  };

  const handleStatusChange = async (item: MenuItem) => {
    const newStatus: MenuItemStatus = item.status === "draft" ? "live" : "draft";
    await updateStatusMutation.mutateAsync({ id: item.id, status: newStatus });
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    form.reset({
      name: item.name,
      name_original: item.name,
      description: item.description,
      price: item.price || "",
      courseTags: item.courseTags,
      course_original: item.courseTags.join(','),
      displayOrder: item.displayOrder || 0,
      image: item.image || "",
      status: item.status as MenuItemStatus,
      allergens: item.allergens,
      restaurantId: item.restaurantId,
      dietary_preferences: item.dietary_preferences,
    });
    setCreateMenuItemOpen(true);
  };

  const handleDelete = (itemId: number) => {
    deleteMutation.mutate([itemId]);
  };

  const deleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const results = await Promise.all(ids.map((id) => apiRequest("DELETE", `/api/menu-items/${id}`)));
      const errors = results.filter((res) => !res.ok);
      if (errors.length > 0) {
        throw new Error(`Failed to delete ${errors.length} items`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items", selectedRestaurant?.id] });
      setSelectedItems([]);
      toast({
        title: "Success",
        description: "Items deleted successfully",
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

  const toggleItemSelection = (id: number) => {
    setSelectedItems((prev) => (prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]));
  };

  const handleDeleteSelected = () => {
    if (selectedItems.length === 0) return;
    deleteMutation.mutate(selectedItems);
  };

  const getPublicMenuUrl = (restaurantId: number) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/menu/${restaurantId}`;
  };

  const copyMenuUrl = async (restaurantId: number) => {
    const url = getPublicMenuUrl(restaurantId);
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Success",
        description: "Menu URL copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy URL",
        variant: "destructive",
      });
    }
  };

  const handleExportCSV = async () => {
    if (!selectedRestaurant?.id) return;

    try {
      const response = await fetch(`/api/restaurants/${selectedRestaurant.id}/menu/export`);
      if (!response.ok) throw new Error("Failed to export menu");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedRestaurant.name.toLowerCase().replace(/[^a-z0-9]/gi, "_")}_menu.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export menu",
        variant: "destructive",
      });
    }
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedRestaurant?.id) return;
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`/api/restaurants/${selectedRestaurant.id}/menu/import`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to import menu items");
      }

      queryClient.invalidateQueries({ queryKey: ["/api/menu-items", selectedRestaurant.id] });
      toast({
        title: "Success",
        description: "Menu items imported successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to import menu items",
        variant: "destructive",
      });
    }
  };

  const handleImageDrop = async (e: React.DragEvent<HTMLDivElement>, itemId?: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('border-2', 'border-primary', 'border-dashed');

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const imageData = reader.result as string;
        if (itemId) {
          try {
            const response = await apiRequest("PATCH", `/api/menu-items/${itemId}`, {
              image: imageData
            });

            if (!response.ok) {
              throw new Error('Failed to update image');
            }

            queryClient.invalidateQueries({ queryKey: ["/api/menu-items", selectedRestaurant?.id] });
            toast({
              title: "Success",
              description: "Image updated successfully",
            });
          } catch (error) {
            toast({
              title: "Error",
              description: "Failed to update image",
              variant: "destructive",
            });
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        form.setValue("image", reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageDelete = async (itemId: number) => {
    try {
      const response = await apiRequest("PATCH", `/api/menu-items/${itemId}`, {
        image: null
      });

      if (!response.ok) {
        throw new Error('Failed to delete image');
      }

      queryClient.invalidateQueries({ queryKey: ["/api/menu-items", selectedRestaurant?.id] });
      toast({
        title: "Success",
        description: "Image deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete image",
        variant: "destructive",
      });
    }
  };


  const groupedByCourse = menuItems ? (
    (menuItems.reduce((acc, item) => {
      if (!item.courseTags?.length) {
        const items = acc.get("Uncategorized") || [];
        acc.set("Uncategorized", [...items, item]);
        return acc;
      }

      item.courseTags.forEach(tag => {
        const items = acc.get(tag) || [];
        acc.set(tag, [...items, item]);
      });
      return acc;
    }, new Map<string, MenuItem[]>())).set(...menuItems.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)))
  ) : new Map();


  const reorderMutation = useMutation({
    mutationFn: async ({ id, displayOrder }: { id: number; displayOrder: number }) => {
      const response = await apiRequest("PATCH", `/api/menu-items/${id}`, { displayOrder });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update item order");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items", selectedRestaurant?.id] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });


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
        title: "Success",
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
    <div className="min-h-screen bg-custom-gray-100">
      <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-sm border-b border-custom-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="rounded-pill">
                    <Store className="mr-2 h-4 w-4" />
                    {selectedRestaurant?.name || "Select Restaurant"}
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {restaurants?.map((restaurant) => (
                    <DropdownMenuItem key={restaurant.id} onClick={() => setSelectedRestaurant(restaurant)}>
                      {restaurant.name}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setCreateRestaurantOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add New Restaurant
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                className="bg-primary text-white hover:bg-primary/90 rounded-full"
                onClick={() => {
                  setCreateMenuItemOpen(true);
                  form.setValue("restaurantId", selectedRestaurant?.id || 0);
                }}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </div>

            <div className="flex-1 flex items-center justify-center">
              <div className="relative">
                <div className="flex items-center gap-6">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-full"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <ImageIcon className="h-5 w-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Upload menu image</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-full"
                          onClick={() => csvFileInputRef.current?.click()}
                        >
                          <Download className="h-5 w-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Import menu CSV</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-full"
                          onClick={handleExportCSV}
                        >
                          <Upload className="h-5 w-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Export menu CSV</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-full"
                          onClick={() => setShowQrCode(true)}
                        >
                          <QrCode className="h-5 w-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Menu QR code</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-full"
                          onClick={() => copyMenuUrl(selectedRestaurant?.id || 0)}
                        >
                          <Globe className="h-5 w-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Copy menu URL</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-full"
                          onClick={() => setShowLabels(!showLabels)}
                        >
                          <ChevronDown className={`h-5 w-5 transition-transform ${showLabels ? "rotate-180" : ""}`} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Toggle menu</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                {showLabels && (
                  <div className="absolute top-full mt-2 bg-white rounded-lg shadow-lg p-4 space-y-3 w-64 z-50">
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <ImageIcon className="h-5 w-5" />
                      <span>Upload menu image</span>
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3"
                      onClick={() => csvFileInputRef.current?.click()}
                    >
                      <Download className="h-5 w-5" />
                      <span>Import menu CSV</span>
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3"
                      onClick={handleExportCSV}
                    >
                      <Upload className="h-5 w-5" />
                      <span>Export menu CSV</span>
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3"
                      onClick={() => setShowQrCode(true)}
                    >
                      <QrCode className="h-5 w-5" />
                      <span>Menu QR code</span>
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3"
                      onClick={() => copyMenuUrl(selectedRestaurant?.id || 0)}
                    >
                      <Globe className="h-5 w-5" />
                      <span>Copy menu URL</span>
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setSettingsOpen(true)}>
                      <Settings className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Settings</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="rounded-full" onClick={() => logoutMutation.mutate()}>
                      <LogOut className="h5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Sign Out</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-custom-gray-400" />
          <Input
            placeholder="Search menu items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 h-12 rounded-3xl border-custom-gray-200 bg-white shadow-sm w-full"
          />
        </div>

        <div className="flex gap-3 mb-6">
          <Button
            variant={statusFilter === null ? "default" : "outline"}
            className={`filter-tab ${statusFilter === null ? "filter-tab-active" : "filter-tab-inactive"}`}
            onClick={() => setStatusFilter(null)}
          >
            All Items ({groupedItems.draft.length + groupedItems.live.length})
          </Button>
          <Button
            variant={statusFilter === "draft" ? "default" : "outline"}
            className={`filter-tab ${statusFilter === "draft" ? "filter-tab-active" : "filter-tab-inactive"}`}
            onClick={() => setStatusFilter("draft")}
          >
            Drafts ({groupedItems.draft?.length || 0})
          </Button>
          <Button
            variant={statusFilter === "live" ? "default" : "outline"}
            className={`filter-tab ${statusFilter === "live" ? "filter-tab-active" : "filter-tab-inactive"}`}
            onClick={() => setStatusFilter("live")}
          >
            Live ({groupedItems.live?.length || 0})
          </Button>
        </div>

        {selectedItems.length > 0 && (
          <Button
            variant="destructive"
            onClick={handleDeleteSelected}
            disabled={deleteMutation.isPending}
            className="mb-6 rounded-full"
          >
            {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete Selected ({selectedItems.length})
          </Button>
        )}

        {/* Menu Items Grid */}
        <motion.div layout className="space-y-6">
          {Array.from(groupedByCourse.entries()).map(([section, items]) => (
            <MenuSection key={section} section={section} items={items} selectedItems={selectedItems} handleStatusChange={handleStatusChange} handleEdit={handleEdit} handleDelete={handleDelete} handleImageDrop={handleImageDrop} handleImageDelete={handleImageDelete} toggleItemSelection={toggleItemSelection} />
          ))}
        </motion.div>


      </main>

      <Dialog
        open={isCreateMenuItemOpen}
        onOpenChange={(isOpen) => {
          setCreateMenuItemOpen(isOpen);
          if (!isOpen) {
            setEditingItem(null);
          }
          if (isOpen && !editingItem) {
            form.reset(defaultFormValues);
          }
        }}
      >
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Menu Item" : "Add Menu Item"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                {...form.register("name")}
                className="border border-input bg-background"
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive mt-1">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                {...form.register("description")}
                className="border border-input bg-background"
              />
              {form.formState.errors.description && (
                <p className="text-sm text-destructive mt-1">
                  {form.formState.errors.description.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="price">Price</Label>
              <Input
                {...form.register("price")}
                className="border border-input bg-background"
              />
              {form.formState.errors.price && (
                <p className="text-sm text-destructive mt-1">
                  {form.formState.errors.price.message}
                </p>
              )}
            </div>

            <div>
              <Label>Course Tags</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {form.watch("courseTags").map((tag, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => {
                        const newTags = [...form.getValues("courseTags")];
                        newTags.splice(index, 1);
                        form.setValue("courseTags", newTags);
                      }}
                    />
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add a new tag"
                  className="border border-input bg-background"
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const value = newTag.trim();
                      if (value && !form.getValues("courseTags").includes(value)) {
                        form.setValue("courseTags", [...form.getValues("courseTags"), value]);
                        setNewTag("");
                      }
                    }
                  }}
                />
                <Button type="button"
                  onClick={() => {
                    const value = newTag.trim();
                    if (value && !form.getValues("courseTags").includes(value)) {
                      form.setValue("courseTags", [...form.getValues("courseTags"), value]);
                      setNewTag("");
                    }
                  }}
                >
                  Add Tag
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="image">Image</Label>
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:border-primary transition-colors relative bg-background"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.currentTarget.classList.add('border-primary');
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.currentTarget.classList.remove('border-primary');
                }}
                onDrop={handleImageDrop}
                onClick={() => document.getElementById('image-upload')?.click()}
              >
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <div className="text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">
                    Drag and drop an image here, or click to select
                  </p>
                </div>
                {form.watch("image") && (
                  <div className="relative mt-4">
                    <img src={form.watch("image")} alt="Preview" className="max-h-40 rounded-lg" />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={(e) => {
                        e.preventDefault();
                        form.setValue("image", "");
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label>Status</Label>
              <select
                {...form.register("status")}
                className="w-full rounded-md border border-input bg-background px-3 py-2"
              >
                <option value="draft">Draft</option>
                <option value="live">Live</option>
              </select>
            </div>

            <div>
              <Label>Allergens</Label>
              <div className="grid grid-cols-2 gap-4 mt-2">
                {(Object.keys(form.getValues().allergens) as Array<keyof InsertMenuItem["allergens"]>).map((key) => (
                  <div key={key} className="flex items-center space-x-2">
                    <Checkbox
                      id={key}
                      checked={form.watch(`allergens.${key}`)}
                      onCheckedChange={(checked) => {
                        form.setValue(`allergens.${key}`, checked as boolean);
                      }}
                    />
                    <Label htmlFor={key} className="capitalize">
                      {key}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>Dietary Preferences</Label>
              <div className="grid grid-cols-2 gap-4 mt-2">
                {(Object.keys(form.getValues().dietary_preferences) as Array<keyof InsertMenuItem["dietary_preferences"]>).map(
                  (key) => (
                    <div key={key} className="flex items-center space-x-2">
                      <Checkbox
                        id={key}
                        checked={form.watch(`dietary_preferences.${key}`)}
                        onCheckedChange={(checked) => {
                          form.setValue(`dietary_preferences.${key}`, checked as boolean);
                        }}
                      />
                      <Label htmlFor={key} className="capitalize">
                        {key}
                      </Label>
                    </div>
                  )
                )}
              </div>
            </div>

            <Button type="submit" className="w-full">
              {editingItem ? "Update Item" : "Add Item"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-900">Account settings</h3>
              <div className="space-y-1">
                <p className="text-xs text-gray-500">Email address</p>
                <p className="text-sm text-gray-700">{user?.email}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-500">Password</p>
                <p className="text-sm text-gray-700">****************</p>
              </div>
              <Button variant="link" className="text-primary p-0 h-auto text-xs" onClick={() => setIsUpdateLoginOpen(true)}>
                Update login details
              </Button>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <h3 className="text-sm font-medium text-gray-900">Your Restaurants</h3>
              <div className="mt-2 space-y-2">
                {restaurants?.map((restaurant) => (
                  <div key={restaurant.id} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{restaurant.name}</span>
                    {restaurants.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-600"
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete ${restaurant.name}?`)) {
                            apiRequest("DELETE", `/api/restaurants/${restaurant.id}`)
                              .then(() => {
                                queryClient.invalidateQueries({ queryKey: ["/api/restaurants"] });
                                toast({
                                  title: "Success",
                                  description: "Restaurant deleted successfully",
                                });
                              })
                              .catch(() => {
                                toast({
                                  title: "Error",
                                  description: "Failed to delete restaurant",
                                  variant: "destructive",
                                });
                              });
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <h3 className="text-sm font-medium text-gray-900">Background Image</h3>
              <div
                className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:border-primary transition-colors relative"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const file = e.dataTransfer.files[0];
                  if (file && file.type.startsWith("image/")) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setBackgroundImage(reader.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              >
                <div className="text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">
                    Drag and drop an image here, or click to select
                  </p>
                </div>
                {backgroundImage && (
                  <div className="relative mt-4">
                    <img src={backgroundImage} alt="Background Preview" className="max-h-40 rounded-lg" />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => setBackgroundImage(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-sm text-gray-500">
                Found an error? Report bugs to{" "}
                <a
                  href="mailto:stevelucasroberts@gmail.com"
                  className="text-primary hover:underline"
                >
                  stevelucasroberts@gmail.com
                </a>
              </p>
            </div>

            <Button
              variant="ghost"
              className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 text-sm gap-2 justify-center"
              onClick={() => logoutMutation.mutate()}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isUpdateLoginOpen} onOpenChange={setIsUpdateLoginOpen}>
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

      <Dialog open={showQrCode} onOpenChange={setShowQrCode}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Menu QR Code</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center" ref={qrCodeRef}>
            <QRCodeSVG
              value={selectedRestaurant ? getPublicMenuUrl(selectedRestaurant.id) : ""}
              size={200}
              level="H"
              includeMargin={true}
            />
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Scan this QR code to view the menu
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowQrCode(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <input
        type="file"
        accept=".csv"
        ref={csvFileInputRef}
        onChange={handleImportCSV}
        className="hidden"
      />
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleImageUpload}
        className="hidden"
      />
    </div>
  );
}

export default HomePage;