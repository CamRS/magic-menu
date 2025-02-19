import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";

export default function HomePage() {
  const { user, logoutMutation } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">{user?.restaurantName}</h1>
            <p className="text-muted-foreground">Welcome back!</p>
          </div>
          <Button variant="outline" onClick={() => logoutMutation.mutate()}>
            Logout
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Link href="/menu">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl">Menu Management</CardTitle>
              </CardHeader>
              <CardContent>
                <img 
                  src="https://images.unsplash.com/photo-1556742205-e10c9486e506"
                  alt="Menu items"
                  className="w-full h-48 object-cover rounded-md mb-4"
                />
                <p className="text-muted-foreground">
                  Add, edit, and organize your menu items. Set dietary restrictions and manage allergen information.
                </p>
              </CardContent>
            </Card>
          </Link>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">QR Code Menu</CardTitle>
            </CardHeader>
            <CardContent>
              <img 
                src="https://images.unsplash.com/photo-1494346480775-936a9f0d0877"
                alt="Restaurant dining"
                className="w-full h-48 object-cover rounded-md mb-4"
              />
              <p className="text-muted-foreground">
                Generate QR codes for your menu that customers can scan to view your mobile-optimized menu.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
