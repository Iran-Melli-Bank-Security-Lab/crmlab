import { Navigate, Outlet } from "react-router-dom";
import { usePermission } from "@/features/access-control/model/usePermission";
import { canAccessRoute } from "@/entities/permission/application/routeAccess";
import { useAuth } from "@/features/auth/model/useAuth";

export default function PermissionRoute({ permissions = [], roles = [] }) {
  const { permissions: userPermissions } = usePermission();
  const { roles: userRoles } = useAuth();

  if (
    !canAccessRoute({
      userPermissions,
      requiredPermissions: permissions,
      userRoles,
      requiredRoles: roles,
    })
  ) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
