import type { Permission, Role, RoleCatalogItem } from "@/shared/types";

export function getPermissionsFromRoleCatalog(
  roles: Role[] = [],
  roleCatalog: RoleCatalogItem[] = []
) {
  return Array.from(
    new Set(
      roles.flatMap(
        (role) => roleCatalog.find((item) => item.key === role)?.permissions || []
      )
    )
  );
}

export function getEffectivePermissions(
  roles: Role[] = [],
  permissions?: Permission[],
  roleCatalog: RoleCatalogItem[] = []
) {
  if (Array.isArray(permissions) && permissions.length > 0) {
    return permissions;
  }

  return getPermissionsFromRoleCatalog(roles, roleCatalog);
}
