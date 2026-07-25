import type { AccessPolicy } from "@/entities/permission/domain/accessPolicy";
import { canAccessPolicy } from "@/entities/permission/domain/accessRules";
import type { Permission, Role } from "@/shared/types";

export type SidebarAccessSubject = {
  permissions: Permission[];
  roles?: Role[];
};

export function canShowNavigationItem(
  subject: SidebarAccessSubject,
  policy: AccessPolicy
) {
  return canAccessPolicy(subject, policy);
}
