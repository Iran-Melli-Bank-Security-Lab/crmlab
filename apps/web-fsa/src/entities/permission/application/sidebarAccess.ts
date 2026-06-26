import type { AccessPolicy } from "@/entities/permission/domain/accessPolicy";
import { canAccessPolicy } from "@/entities/permission/domain/accessRules";
import type { Permission } from "@/shared/types";

export type SidebarAccessSubject = {
  permissions: Permission[];
};

export function canShowNavigationItem(
  subject: SidebarAccessSubject,
  policy: AccessPolicy
) {
  return canAccessPolicy(subject, policy);
}
