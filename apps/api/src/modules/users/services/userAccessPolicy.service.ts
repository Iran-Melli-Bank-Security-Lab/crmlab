import { isAdminPermission, type Permission } from "@/constants/permissions";
import { ROLES, type Role } from "@/constants/roles";
import { HTTP_STATUS } from "@/constants/http";
import { AppError } from "@/utils/AppError";

function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}

export function assertAdminAccessIsNotGranted(
  roles: Role[] = [],
  permissions: Permission[] = []
) {
  if (roles.includes(ROLES.ADMIN) || permissions.some(isAdminPermission)) {
    throw new AppError(
      "The built-in admin role and permissions cannot be assigned through user management",
      HTTP_STATUS.FORBIDDEN
    );
  }
}

export function assertAdminCannotDeactivateSelf(input: {
  actorUserId?: string;
  targetUserId: string;
  currentRoles: Role[];
  requestedStatus?: "Active" | "Inactive";
}) {
  if (
    input.actorUserId === input.targetUserId &&
    input.currentRoles.includes(ROLES.ADMIN) &&
    input.requestedStatus === "Inactive"
  ) {
    throw new AppError(
      "An admin cannot deactivate their own account",
      HTTP_STATUS.BAD_REQUEST
    );
  }
}

export function protectAdminUserAccess(input: {
  currentRoles: Role[];
  currentPermissions: Permission[];
  requestedRoles: Role[];
  requestedPermissions: Permission[];
}) {
  const isAdminUser = input.currentRoles.includes(ROLES.ADMIN);

  if (!isAdminUser) {
    assertAdminAccessIsNotGranted(input.requestedRoles, input.requestedPermissions);
    return {
      roles: unique(input.requestedRoles),
      permissions: unique(input.requestedPermissions),
    };
  }

  const protectedPermissions = input.currentPermissions.filter(isAdminPermission);
  return {
    roles: unique([
      ROLES.ADMIN,
      ...input.requestedRoles.filter((role) => role !== ROLES.ADMIN),
    ]),
    permissions: unique([
      ...protectedPermissions,
      ...input.requestedPermissions.filter((permission) => !isAdminPermission(permission)),
    ]),
  };
}
