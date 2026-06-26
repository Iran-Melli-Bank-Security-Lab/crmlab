import { canAccessPolicy } from "@/entities/permission/domain/accessRules";
import type { AccessPolicy } from "@/entities/permission/domain/accessPolicy";
import type { Permission } from "@/shared/types";

export function canAccessRoute({
  userPermissions = [],
  requiredPermissions = [],
}: {
  userPermissions?: Permission[];
  requiredPermissions?: Permission[];
}) {
  const policy: AccessPolicy = {
    permissions: requiredPermissions,
  };

  return canAccessPolicy({ permissions: userPermissions }, policy);
}
