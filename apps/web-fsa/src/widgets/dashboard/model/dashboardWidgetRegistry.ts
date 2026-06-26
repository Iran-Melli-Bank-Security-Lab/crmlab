import { PERMISSIONS } from "@/entities/permission/model/permissions";
import type { Permission } from "@/shared/types";

export type DashboardWidgetId =
  | "admin-platform"
  | "admin-users"
  | "security-review"
  | "pentest-work"
  | "devops-delivery"
  | "quality-review"
  | "qa-work"
  | "representative-work";

export type DashboardWidgetConfig = {
  id: DashboardWidgetId;
  permissions: Permission[];
  order: number;
};

export const dashboardWidgetRegistry: DashboardWidgetConfig[] = [
  {
    id: "admin-platform",
    permissions: [PERMISSIONS.ADMIN_SYSTEM_MANAGE, PERMISSIONS.ADMIN_DASHBOARD_READ],
    order: 10,
  },
  {
    id: "admin-users",
    permissions: [PERMISSIONS.ADMIN_SYSTEM_MANAGE, PERMISSIONS.ADMIN_USERS_READ],
    order: 20,
  },
  {
    id: "security-review",
    permissions: [PERMISSIONS.SECURITY_PROJECTS_READ],
    order: 30,
  },
  {
    id: "pentest-work",
    permissions: [PERMISSIONS.PENTEST_PROJECTS_READ],
    order: 40,
  },
  {
    id: "devops-delivery",
    permissions: [PERMISSIONS.DEVOPS_PROJECTS_READ],
    order: 50,
  },
  {
    id: "quality-review",
    permissions: [PERMISSIONS.QUALITY_PROJECTS_READ],
    order: 60,
  },
  {
    id: "qa-work",
    permissions: [PERMISSIONS.QA_PROJECTS_READ],
    order: 70,
  },
  {
    id: "representative-work",
    permissions: [PERMISSIONS.REPRESENTATIVE_PROJECTS_READ],
    order: 80,
  },
];
