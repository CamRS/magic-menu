import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./hooks/use-auth";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import HomePage from "@/pages/restaurant-back";
import PublicMenuPage from "@/pages/public-menu-page";
import ConsumerHomePage from "@/pages/consumer-home-page";
import { ProtectedRoute } from "./lib/protected-route";

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/menu/:restaurantId" component={PublicMenuPage} />
      <Route path="/auth" component={AuthPage} />

      {/* Protected routes with specific user type requirements */}
      <ProtectedRoute 
        path="/" 
        component={HomePage}
        requiredUserType="restaurant"
      />
      <ProtectedRoute 
        path="/consumer" 
        component={ConsumerHomePage}
        requiredUserType="consumer"
      />

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