import { PERMISSIONS } from "@/entities/permission/model/permissions";
import type { Permission } from "@/shared/types";

export type AccessPolicy = {
  permissions?: Permission[];
};

export type DashboardAccessPolicy = AccessPolicy & {
  path: string;
};

export const PROJECT_ACCESS_PERMISSIONS: Permission[] = [
  PERMISSIONS.SECURITY_PROJECTS_READ,
  PERMISSIONS.QUALITY_PROJECTS_READ,
  PERMISSIONS.PENTEST_PROJECTS_READ,
  PERMISSIONS.DEVOPS_PROJECTS_READ,
  PERMISSIONS.QA_PROJECTS_READ,
  PERMISSIONS.REPRESENTATIVE_PROJECTS_READ,
];

export const DASHBOARD_ACCESS_PERMISSIONS: Permission[] = [
  PERMISSIONS.ADMIN_SYSTEM_MANAGE,
  PERMISSIONS.ADMIN_DASHBOARD_READ,
  PERMISSIONS.ADMIN_USERS_READ,
  PERMISSIONS.SECURITY_DASHBOARD_READ,
  PERMISSIONS.SECURITY_PROJECTS_READ,
  PERMISSIONS.QUALITY_DASHBOARD_READ,
  PERMISSIONS.QUALITY_PROJECTS_READ,
  PERMISSIONS.PENTEST_DASHBOARD_READ,
  PERMISSIONS.PENTEST_PROJECTS_READ,
  PERMISSIONS.DEVOPS_DASHBOARD_READ,
  PERMISSIONS.DEVOPS_PROJECTS_READ,
  PERMISSIONS.REPRESENTATIVE_DASHBOARD_READ,
  PERMISSIONS.REPRESENTATIVE_PROJECTS_READ,
  PERMISSIONS.QA_DASHBOARD_READ,
  PERMISSIONS.QA_PROJECTS_READ,
];

export const ROUTE_ACCESS_POLICIES = {
  dashboard: {
    path: "/dashboard",
    permissions: DASHBOARD_ACCESS_PERMISSIONS,
  },
  adminUsers: {
    path: "/admin/users",
    permissions: [PERMISSIONS.ADMIN_SYSTEM_MANAGE, PERMISSIONS.ADMIN_USERS_READ],
  },
  projects: {
    path: "/projects",
    permissions: PROJECT_ACCESS_PERMISSIONS,
  },
  pentestWorkspace: {
    path: "/projects/pentest/:projectId",
    permissions: [PERMISSIONS.PENTEST_PROJECTS_READ],
  },
  createProject: {
    path: "/projects/create",
    permissions: [PERMISSIONS.ADMIN_PROJECTS_CREATE],
  },
  profile: {
    path: "/profile",
    permissions: [],
  },
  settings: {
    path: "/settings",
    permissions: [],
  },
} satisfies Record<string, AccessPolicy & { path: string }>;

export const DASHBOARD_ACCESS_PRIORITY: DashboardAccessPolicy[] = [
  ROUTE_ACCESS_POLICIES.dashboard,
];
