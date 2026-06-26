import {
  DASHBOARD_ACCESS_PRIORITY,
  type DashboardAccessPolicy,
} from "@/entities/permission/domain/accessPolicy";
import { hasAnyPermissionGrant } from "@/entities/permission/domain/accessRules";
import type { Permission } from "@/shared/types";

const fallbackDashboardPath = "/profile";

export function getDashboardPathByPermissions(
  permissions: Permission[] = [],
  policies: DashboardAccessPolicy[] = DASHBOARD_ACCESS_PRIORITY
) {
  const matchingPolicy = policies.find((policy) =>
    hasAnyPermissionGrant(permissions, policy.permissions || [])
  );

  return matchingPolicy?.path || fallbackDashboardPath;
}
