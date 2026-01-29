import { useAuth } from "@/hooks/use-auth";
import { DEV_BYPASS_AUTH } from "@/lib/dev-bypass";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

interface ProtectedRouteProps {
  path: string;
  component: React.ComponentType;
}

export function ProtectedRoute({ path, component: Component }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  return (
    <Route path={path}>
      {() => {
        if (isLoading) {
          return (
            <div className="flex items-center justify-center min-h-screen">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          );
        }

        if (!user) {
          if (DEV_BYPASS_AUTH) {
            return <Component />;
          }
          return <Redirect to="/auth" />;
        }

        // For client portal route, only allow client users
        if (path === "/client-portal") {
          if (!(user.role === 'client' || user.role === 'client_admin' || user.role === 'client_user')) {
            return <Redirect to="/" />;
          }
        }
        
        // Redirect client users to client portal if they try to access main app
        if ((user.role === 'client' || user.role === 'client_admin' || user.role === 'client_user') && 
            path !== "/client-portal") {
          return <Redirect to="/client-portal" />;
        }

        return <Component />;
      }}
    </Route>
  );
}