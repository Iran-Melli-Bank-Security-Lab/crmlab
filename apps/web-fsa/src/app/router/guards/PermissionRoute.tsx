import { Navigate, Outlet } from "react-router-dom";
import { usePermission } from "@/features/access-control/model/usePermission";
import { canAccessRoute } from "@/entities/permission/application/routeAccess";

export default function PermissionRoute({ permissions = [] }) {
  const { permissions: userPermissions } = usePermission();

  if (
    !canAccessRoute({
      userPermissions,
      requiredPermissions: permissions,
    })
  ) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
