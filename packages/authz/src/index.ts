export {
  ALL_PERMISSIONS,
  LEGACY_PERMISSION_ALIASES,
  PERMISSIONS,
  PERMISSION_ACTIONS,
  PERMISSION_DOMAINS,
  PERMISSION_KEY_PATTERN,
  PERMISSION_REGISTRY,
  PERMISSION_SCOPES,
  isPermissionKey,
  normalizePermissionKey,
  type PermissionAction,
  type PermissionDefinition,
  type PermissionDomain,
  type PermissionScope,
  type Permission,
} from "./permissions.js";
export { ALL_ROLES, ROLES, type Role } from "./roles.js";
export { ROLE_PERMISSIONS, getPermissionsFromRoles } from "./rolePermissions.js";
