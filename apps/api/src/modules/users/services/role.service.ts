import {
  ALL_PERMISSIONS,
  normalizePermissionKey,
  type Permission,
} from "@/constants/permissions";
import { ROLE_PERMISSIONS } from "@/constants/rolePermissions";
import { ALL_ROLES, ROLES, type Role } from "@/constants/roles";
import { RoleModel, type RoleDocument } from "../models/role.model";

const ROLE_NAMES: Record<Role, string> = {
  [ROLES.ADMIN]: "Admin",
  [ROLES.PENTESTER]: "Pentester",
  [ROLES.DEVOPS]: "DevOps",
  [ROLES.REPRESENTATIVE]: "Representative",
  [ROLES.QA]: "QA",
  [ROLES.PROJECT_MANAGER_SECURITY]: "Project Manager Security",
  [ROLES.PROJECT_MANAGER_QA]: "Project Manager QA",
};

const VALID_PERMISSIONS = new Set<Permission>(ALL_PERMISSIONS);

function toRoleResponse(role: RoleDocument) {
  return {
    id: role._id.toString(),
    key: role.key,
    name: role.name,
    description: role.description,
    permissions: role.permissions,
    isSystem: role.isSystem,
  };
}

function normalizeStoredPermissions(role: Role, permissions: string[] = []) {
  const normalizedPermissions = permissions
    .map((permission) => normalizePermissionKey(permission))
    .filter((permission): permission is Permission => Boolean(permission));
  const hasUnsupportedPermissions =
    normalizedPermissions.length !== permissions.length ||
    normalizedPermissions.some((permission) => !VALID_PERMISSIONS.has(permission));

  if (hasUnsupportedPermissions) {
    return ROLE_PERMISSIONS[role] || [];
  }

  return Array.from(new Set(normalizedPermissions));
}

export async function ensureDefaultRoles() {
  await Promise.all(
    ALL_ROLES.map((role) =>
      RoleModel.updateOne(
        { key: role },
        {
          $setOnInsert: {
            key: role,
            name: ROLE_NAMES[role],
            permissions: ROLE_PERMISSIONS[role] || [],
            isSystem: true,
          },
        },
        { upsert: true, runValidators: true }
      )
    )
  );

  const roles: RoleDocument[] = await RoleModel.find();
  await Promise.all(
    roles.map((role: RoleDocument) => {
      const permissions = normalizeStoredPermissions(role.key, role.permissions);

      if (
        permissions.length === role.permissions.length &&
        permissions.every(
          (permission: Permission, index: number) => permission === role.permissions[index]
        )
      ) {
        return Promise.resolve();
      }

      role.permissions = permissions;
      return role.save();
    })
  );
}

export async function getRolesForDashboard() {
  await ensureDefaultRoles();
  const roles = await RoleModel.find().sort({ name: 1 });
  return roles.map(toRoleResponse);
}

export async function updateRolePermissions(role: Role, permissions: Permission[]) {
  const updated = await RoleModel.findOneAndUpdate(
    { key: role },
    {
      $set: {
        name: ROLE_NAMES[role],
        permissions: Array.from(new Set(permissions)),
        isSystem: true,
      },
      $setOnInsert: { key: role },
    },
    { new: true, upsert: true, runValidators: true }
  );

  return toRoleResponse(updated);
}

export async function syncRolePermissionsFromConstants() {
  const roles = await Promise.all(
    ALL_ROLES.map((role) =>
      RoleModel.findOneAndUpdate(
        { key: role },
        {
          $set: {
            name: ROLE_NAMES[role],
            permissions: ROLE_PERMISSIONS[role] || [],
            isSystem: true,
          },
          $setOnInsert: { key: role },
        },
        { new: true, upsert: true, runValidators: true }
      )
    )
  );

  return roles.map(toRoleResponse);
}

export async function getPermissionsForRoles(roles: Role[] = []) {
  const rolePermissions = await getPermissionMapForRoles(roles);

  return Array.from(new Set(Object.values(rolePermissions).flat()));
}

export async function getPermissionMapForRoles(roles: Role[]) {
  const uniqueRoles = Array.from(new Set(roles));
  const roleDocs = await RoleModel.find({ key: { $in: uniqueRoles } });
  const permissionsByRole = new Map<Role, Permission[]>(roleDocs.map((role) => [role.key, role.permissions]));

  return uniqueRoles.reduce<Partial<Record<Role, Permission[]>>>((result, role) => {
    const savedPermissions = permissionsByRole.get(role);
    result[role] = savedPermissions ? normalizeStoredPermissions(role, savedPermissions) : ROLE_PERMISSIONS[role] || [];
    return result;
  }, {});
}

export function getAllPermissionOptions() {
  return ALL_PERMISSIONS;
}
