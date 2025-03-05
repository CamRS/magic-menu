import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

export function ProtectedRoute({
  path,
  component: Component,
  requiredUserType,
}: {
  path: string;
  component: () => React.JSX.Element;
  requiredUserType?: 'consumer' | 'restaurant';
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // Redirect users to their appropriate home page based on their type
  if (requiredUserType && user.userType !== requiredUserType) {
    const redirectPath = user.userType === 'restaurant' ? '/' : '/consumer';
    return (
      <Route path={path}>
        <Redirect to={redirectPath} />
      </Route>
    );
  }

  return <Component />;
}