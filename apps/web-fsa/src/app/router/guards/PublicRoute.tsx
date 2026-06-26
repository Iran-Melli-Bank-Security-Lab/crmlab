import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/features/auth/model/useAuth";
import { getDashboardPathByPermissions } from "@/shared/lib/dashboard";

export default function PublicRoute() {
  const { isAuthenticated, permissions } = useAuth();

  if (isAuthenticated) {
    return <Navigate to={getDashboardPathByPermissions(permissions)} replace />;
  }

  return <Outlet />;
}
