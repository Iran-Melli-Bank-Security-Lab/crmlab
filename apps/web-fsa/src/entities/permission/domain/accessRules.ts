import { PERMISSIONS } from "@/entities/permission/model/permissions";
import type { AccessPolicy } from "@/entities/permission/domain/accessPolicy";
import type { Permission, Role } from "@/shared/types";

export type AccessSubject = {
  permissions?: Permission[];
  roles?: Role[];
};

export function hasPermissionGrant(
  permissions: Permission[] = [],
  permission: Permission
) {
  return permissions.includes(PERMISSIONS.ADMIN_SYSTEM_MANAGE) || permissions.includes(permission);
}

export function hasAnyPermissionGrant(
  permissions: Permission[] = [],
  requiredPermissions: Permission[] = []
) {
  return (
    requiredPermissions.length === 0 ||
    permissions.includes(PERMISSIONS.ADMIN_SYSTEM_MANAGE) ||
    requiredPermissions.some((permission) => permissions.includes(permission))
  );
}

export function hasAnyExplicitPermissionGrant(
  permissions: Permission[] = [],
  requiredPermissions: Permission[] = []
) {
  return (
    requiredPermissions.length === 0 ||
    requiredPermissions.some((permission) => permissions.includes(permission))
  );
}

export function hasAllPermissionGrants(
  permissions: Permission[] = [],
  requiredPermissions: Permission[] = []
) {
  return (
    permissions.includes(PERMISSIONS.ADMIN_SYSTEM_MANAGE) ||
    requiredPermissions.every((permission) => permissions.includes(permission))
  );
}

export function canAccessPolicy(subject: AccessSubject, policy: AccessPolicy) {
  const hasPermission = hasAnyPermissionGrant(
    subject.permissions || [],
    policy.permissions || []
  );
  const hasRole =
    !policy.roles?.length ||
    policy.roles.some((role) => subject.roles?.includes(role));
  return hasPermission && hasRole;
}
