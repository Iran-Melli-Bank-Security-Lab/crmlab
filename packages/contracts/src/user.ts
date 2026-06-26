import type { Permission, Role } from "@role-dashboard/authz";

export type UserStatus = "Active" | "Inactive";

export type UserContract = {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  roles: Role[];
  permissions: Permission[];
  status?: UserStatus;
  avatarUrl?: string;
};

export type UserFormPayloadContract = {
  id?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  roles: Role[];
  permissions: Permission[];
  status?: UserStatus;
  avatarUrl?: string;
};
