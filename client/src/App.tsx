import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./hooks/use-auth";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import HomePage from "@/pages/home-page";
import MenuPage from "@/pages/menu-page";
import PublicMenuPage from "@/pages/public-menu-page";
import ConsumerHomePage from "@/pages/consumer-home-page";
import { ProtectedRoute } from "./lib/protected-route";
import { useAuth } from "./hooks/use-auth"; // Added import for useAuth

function Router() {
  const { user } = useAuth();

  return (
    <Switch>
      {/* Public routes */}
      <Route path="/menu/:restaurantId" component={PublicMenuPage} />
      <Route path="/auth" component={AuthPage} />

      {/* Protected routes */}
      <ProtectedRoute 
        path="/" 
        component={user?.userType === "restaurant" ? HomePage : ConsumerHomePage} 
      />
      <ProtectedRoute path="/menu" component={MenuPage} />

      {/* 404 route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;