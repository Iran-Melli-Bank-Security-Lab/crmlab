import type { Permission, Role } from "@role-dashboard/authz";

export type RoleCatalogItemContract = {
  id: string;
  key: Role;
  name: string;
  permissions: Permission[];
  isSystem: boolean;
};

export type RolesAndPermissionsContract = {
  roles: RoleCatalogItemContract[];
  permissions: Permission[];
};
