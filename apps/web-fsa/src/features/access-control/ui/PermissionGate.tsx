import { usePermission } from "@/features/access-control/model/usePermission";

export default function PermissionGate({ permissions = [], children, fallback = null }) {
  const { hasAnyPermission } = usePermission();
  return hasAnyPermission(permissions) ? children : fallback;
}
