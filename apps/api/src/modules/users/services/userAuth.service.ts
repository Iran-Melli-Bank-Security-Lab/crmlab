import { normalizePermissionKey, type Permission } from "@/constants/permissions";
import type { Role } from "@/constants/roles";
import { getPermissionsForRoles } from "./role.service";
import { normalizeRoles, UserModel, type UserDocument } from "../models/user.model";
import { UserPermissionModel } from "../models/userPermission.model";

function uniquePermissions(permissions: Permission[] = []) {
  return Array.from(new Set(permissions));
}

export async function getDefaultPermissionsForRoles(roles: Role[]) {
  return uniquePermissions(await getPermissionsForRoles(roles));
}

export async function replaceUserRoles(
  userId: string,
  roles: Role[],
  status?: "Active" | "Inactive"
) {
  return UserModel.findByIdAndUpdate(
    userId,
    {
      $set: {
        roles,
        ...(status ? { status, isActive: status !== "Inactive" } : {}),
      },
      $inc: { sessionVersion: 1 },
    },
    { new: true, runValidators: true }
  );
}

export async function upsertUserPermissions(userId: string, permissions: Permission[]) {
  const unique = uniquePermissions(permissions);

  await UserPermissionModel.findOneAndUpdate(
    { userId },
    {
      $set: { permissions: unique },
      $setOnInsert: { userId },
    },
    { upsert: true, runValidators: true }
  );

  return unique;
}

export async function getOrCreateUserPermissions(user: UserDocument, roles = normalizeRoles(user)) {
  const existing = await UserPermissionModel.findOne({ userId: user._id });
  if (existing) {
    const normalizedPermissions = existing.permissions
      .map((permission) => normalizePermissionKey(permission))
      .filter((permission): permission is Permission => Boolean(permission));
    const hasInvalidStoredPermissions =
      normalizedPermissions.length !== existing.permissions.length;

    if (!hasInvalidStoredPermissions) {
      const unique = uniquePermissions(normalizedPermissions);

      if (existing.permissions.some((permission, index) => permission !== unique[index])) {
        return upsertUserPermissions(user._id.toString(), unique);
      }

      return unique;
    }

    return upsertUserPermissions(
      user._id.toString(),
      await getDefaultPermissionsForRoles(roles)
    );
  }

  return upsertUserPermissions(user._id.toString(), await getDefaultPermissionsForRoles(roles));
}

export async function toAuthUserContext(user: UserDocument) {
  const roles = normalizeRoles(user);
  const permissions = await getOrCreateUserPermissions(user, roles);

  return {
    id: user._id.toString(),
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    avatarUrl: user.avatarUrl || user.profileImageUrl,
    status: user.status || (user.isActive === false ? "Inactive" : "Active"),
    roles,
    permissions,
    sessionVersion: user.sessionVersion || 0,
  };
}
