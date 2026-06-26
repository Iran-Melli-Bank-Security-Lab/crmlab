export {
  getEffectivePermissions,
  getPermissionsFromRoleCatalog,
} from "@/entities/permission/application/rolePermissions";
export {
  canAccessPolicy,
  hasAllPermissionGrants,
  hasAnyExplicitPermissionGrant,
  hasAnyPermissionGrant,
  hasPermissionGrant,
} from "@/entities/permission/domain/accessRules";
