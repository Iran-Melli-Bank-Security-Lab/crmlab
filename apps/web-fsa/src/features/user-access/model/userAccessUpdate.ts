import { isAdminPermission, ROLES } from "@role-dashboard/authz";
import type { Permission, Role, UserStatus } from "@/shared/types";

export function canChangeUserStatus(input: {
  currentUserId?: string;
  selectedUserId?: string;
  selectedUserRoles: Role[];
}) {
  return !(
    input.currentUserId === input.selectedUserId &&
    input.selectedUserRoles.includes(ROLES.ADMIN)
  );
}

export function getVisibleRoles(roles: Role[], selectedUserRoles: Role[]) {
  const isAdminUser = selectedUserRoles.includes(ROLES.ADMIN);
  return roles.filter((role) => role !== ROLES.ADMIN || isAdminUser);
}

export function getVisiblePermissions(
  permissions: Permission[],
  selectedUserRoles: Role[]
) {
  const isAdminUser = selectedUserRoles.includes(ROLES.ADMIN);
  return permissions.filter(
    (permission) => !isAdminPermission(permission) || isAdminUser
  );
}

export function preserveAdminPermissions(
  currentPermissions: Permission[],
  nextPermissions: Permission[],
  isAdminUser: boolean
) {
  if (!isAdminUser) return nextPermissions;
  return Array.from(
    new Set([
      ...currentPermissions.filter(isAdminPermission),
      ...nextPermissions.filter((permission) => !isAdminPermission(permission)),
    ])
  );
}

export function buildUserAccessUpdate(input: {
  id: string;
  roles: Role[];
  permissions: Permission[];
  status: UserStatus;
}) {
  return {
    id: input.id,
    roles: [...input.roles],
    permissions: [...input.permissions],
    status: input.status,
  };
}
