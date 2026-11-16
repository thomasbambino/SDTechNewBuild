import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

export function ProtectedRoute({
  path,
  role,
  component: Component,
}: {
  path: string;
  role?: string;
  component: () => React.JSX.Element;
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
  
  // Role-based access. "admin" is the gate for back-office routes and
  // "internal" users satisfy it (same back-office access, fewer destructive
  // powers — enforced per-action on the server).
  const isAdminLike = user.role === "admin" || user.role === "internal";
  const isAllowed =
    !role ||
    user.role === role ||
    (role === "admin" && isAdminLike);

  if (!isAllowed) {
    const redirectPath = isAdminLike ? "/admin" : "/client";
    return (
      <Route path={path}>
        <Redirect to={redirectPath} />
      </Route>
    );
  }

  return <Route path={path} component={Component} />;
}
