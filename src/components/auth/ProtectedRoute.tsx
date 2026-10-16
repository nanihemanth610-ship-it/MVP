import { Navigate, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import type { UserRole } from "@/types/claim";
import type { AppRole } from "@/types/admin";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  allowedRoles?: (UserRole | AppRole)[];
  requireActiveOrg?: boolean;
  children?: React.ReactNode;
}

export function ProtectedRoute({
  allowedRoles,
  requireActiveOrg = false,
  children,
}: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  const location = useLocation();

  if (isLoadingAuth) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-medium">
          Verifying security credentials and access permissions...
        </p>
      </div>
    );
  }

  // Not signed in at all
  if (!isAuthenticated || !user) {
    const returnUrl = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?returnTo=${returnUrl}`} replace />;
  }

  // Signed in with Google, but no administrative role assigned yet
  if (user.role === "pending") {
    return <Navigate to="/pending-approval" replace />;
  }

  // Suspended organization access check
  if (
    requireActiveOrg &&
    user.organizationStatus &&
    user.organizationStatus !== "active" &&
    user.role !== "super_admin" &&
    user.role !== "platform_admin"
  ) {
    return <Navigate to="/unauthorized?reason=org_suspended" replace />;
  }

  // Role permissions check
  if (allowedRoles && allowedRoles.length > 0) {
    // Super admins have omni-access across portals
    const isSuperAdmin =
      user.role === "super_admin" || user.role === "platform_admin";
    const hasRole =
      isSuperAdmin || (allowedRoles as string[]).includes(user.role);

    if (!hasRole) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return children ? <>{children}</> : <Outlet />;
}
