import { useAuth } from "@/features/auth/model/useAuth";
import {
  hasAllPermissionGrants,
  hasAnyPermissionGrant,
  hasPermissionGrant,
} from "@/entities/permission/model/permissionGrants";
import type { Permission } from "@/shared/types";

export function usePermission() {
  const { permissions } = useAuth();

  const hasPermission = (permission: Permission) =>
    hasPermissionGrant(permissions, permission);

  const hasAnyPermission = (requiredPermissions: Permission[] = []) =>
    hasAnyPermissionGrant(permissions, requiredPermissions);

  const hasAllPermissions = (requiredPermissions: Permission[] = []) =>
    hasAllPermissionGrants(permissions, requiredPermissions);

  return {
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };
}
