import { canAccessPolicy } from "@/entities/permission/domain/accessRules";
import type { AccessPolicy } from "@/entities/permission/domain/accessPolicy";
import type { Permission, Role } from "@/shared/types";

export function canAccessRoute({
  userPermissions = [],
  requiredPermissions = [],
  userRoles = [],
  requiredRoles = [],
}: {
  userPermissions?: Permission[];
  requiredPermissions?: Permission[];
  userRoles?: Role[];
  requiredRoles?: Role[];
}) {
  const policy: AccessPolicy = {
    permissions: requiredPermissions,
    roles: requiredRoles,
  };

  return canAccessPolicy(
    { permissions: userPermissions, roles: userRoles },
    policy
  );
}
