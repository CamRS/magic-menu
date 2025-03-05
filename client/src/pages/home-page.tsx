import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Copy, Store, PlusCircle, ChevronDown, Loader2, Download, Upload, Trash2, MoreVertical, Pencil, Globe, Image as ImageIcon, QrCode, Search, Eye, EyeOff } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { type Restaurant, type MenuItem, type InsertMenuItem, insertMenuItemSchema, insertRestaurantSchema } from "@shared/schema";
import { useState, useRef, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { QRCodeSVG } from 'qrcode.react';
import { useDropbox } from "@/hooks/use-dropbox";

type MenuItemStatus = "draft" | "live";

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [isCreateMenuItemOpen, setCreateMenuItemOpen] = useState(false);
  const [isCreateRestaurantOpen, setCreateRestaurantOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [showQrCode, setShowQrCode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<MenuItemStatus | null>(null);
  const qrCodeRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageUploadRef = useRef<HTMLInputElement>(null);

  const { data: restaurants, isLoading: isLoadingRestaurants } = useQuery<Restaurant[]>({
    queryKey: ["/api/restaurants"],
    enabled: !!user?.id,
  });

  const { data: menuItems, isLoading: isLoadingMenuItems } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu-items", selectedRestaurant?.id],
    queryFn: async () => {
      if (!selectedRestaurant?.id) return [];
      const response = await apiRequest("GET", `/api/menu-items?restaurantId=${selectedRestaurant.id}`);
      if (!response.ok) throw new Error("Failed to fetch menu items");
      return response.json();
    },
    enabled: !!selectedRestaurant?.id && !!user?.id,
  });

  // Group items by status
  const groupedItems = useMemo(() => {
    if (!menuItems) return { draft: [], live: [] };
    return menuItems.reduce(
      (acc, item) => {
        acc[item.status as MenuItemStatus].push(item);
        return acc;
      },
      { draft: [], live: [] } as Record<MenuItemStatus, MenuItem[]>
    );
  }, [menuItems]);

  // Filter items based on search and status
  const filteredItems = useMemo(() => {
    let items = menuItems || [];

    // Apply search filter
    if (searchTerm) {
      items = items.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter) {
      items = items.filter(item => item.status === statusFilter);
    }

    return items;
  }, [menuItems, searchTerm, statusFilter]);

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

  const handleStatusChange = async (item: MenuItem) => {
    const newStatus: MenuItemStatus = item.status === "draft" ? "live" : "draft";
    await updateStatusMutation.mutateAsync({ id: item.id, status: newStatus });
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    setCreateMenuItemOpen(true);
  };

  const handleDelete = (itemId: number) => {
    deleteMutation.mutate([itemId]);
  };

  const deleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const results = await Promise.all(
        ids.map((id) => apiRequest("DELETE", `/api/menu-items/${id}`))
      );
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
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = () => {
    if (selectedItems.length === 0) return;
    deleteMutation.mutate(selectedItems);
  };

  const MenuItemCard = ({ item }: { item: MenuItem }) => {
    return (
      <Card className="bg-white shadow-sm">
        <CardContent className="p-4">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedItems.includes(item.id)}
                onCheckedChange={() => toggleItemSelection(item.id)}
              />
              <div>
                <h3 className="font-semibold">{item.name}</h3>
                <p className="text-sm text-gray-600">{item.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant={item.status === "live" ? "default" : "secondary"}>
                {item.status}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleStatusChange(item)}
                disabled={updateStatusMutation.isPending}
              >
                {item.status === "draft" ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEdit(item)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(item.id)}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {item.image && (
            <img
              src={item.image}
              alt={item.name}
              className="mt-4 w-full h-48 object-cover rounded-lg"
            />
          )}

          <div className="mt-4 flex justify-between items-center">
            <div className="flex flex-wrap gap-2">
              {Object.entries(item.allergens)
                .filter(([_, value]) => value)
                .map(([key]) => (
                  <Badge key={key} variant="outline" className="capitalize">
                    {key}
                  </Badge>
                ))}
            </div>
            <span className="font-semibold">
              {item.price ? `$${parseFloat(item.price).toFixed(2)}` : ''}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4">
        {/* Header with restaurant selection and actions */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">Menu Items</h1>
            {selectedRestaurant && (
              <Badge variant="outline" className="text-lg">
                {selectedRestaurant.name}
              </Badge>
            )}
          </div>

          {/* Restaurant selector dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Store className="mr-2 h-4 w-4" />
                Select Restaurant
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {restaurants?.map((restaurant) => (
                <DropdownMenuItem
                  key={restaurant.id}
                  onClick={() => setSelectedRestaurant(restaurant)}
                >
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
        </div>

        {/* Search and filters */}
        <div className="mb-6">
          <div className="flex gap-4 mb-4">
            <Input
              type="search"
              placeholder="Search menu items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <Button onClick={() => setCreateMenuItemOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          </div>

          {/* Status filters */}
          <div className="flex gap-2">
            <Button
              variant={statusFilter === null ? "default" : "outline"}
              onClick={() => setStatusFilter(null)}
            >
              All Items
            </Button>
            <Button
              variant={statusFilter === "draft" ? "default" : "outline"}
              onClick={() => setStatusFilter("draft")}
            >
              Drafts ({groupedItems.draft?.length || 0})
            </Button>
            <Button
              variant={statusFilter === "live" ? "default" : "outline"}
              onClick={() => setStatusFilter("live")}
            >
              Live ({groupedItems.live?.length || 0})
            </Button>
          </div>
        </div>

        {/* Selected items actions */}
        {selectedItems.length > 0 && (
          <div className="mb-4">
            <Button
              variant="destructive"
              onClick={handleDeleteSelected}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete Selected ({selectedItems.length})
            </Button>
          </div>
        )}

        {/* Menu items list */}
        <div className="space-y-4">
          {filteredItems.map((item) => (
            <MenuItemCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}