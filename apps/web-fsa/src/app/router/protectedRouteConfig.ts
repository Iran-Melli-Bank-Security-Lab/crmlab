import { lazy } from "react";
import { PERMISSIONS } from "@/entities/permission/model/permissions";
import { ROUTE_ACCESS_POLICIES } from "@/entities/permission/domain/accessPolicy";

const Dashboard = lazy(() => import("@/pages/dashboard/Dashboard"));
const DashboardRedirect = lazy(() => import("@/pages/dashboard/DashboardRedirect"));
const AdminUsers = lazy(() => import("@/pages/admin-users/AdminUsers"));
const AuditLogs = lazy(() => import("@/pages/audit-logs/AuditLogs"));
const Profile = lazy(() => import("@/pages/profile/Profile"));
const Settings = lazy(() => import("@/pages/settings/Settings"));
const Projects = lazy(() => import("@/pages/projects/Projects"));
const Tasks = lazy(() => import("@/pages/tasks/Tasks"));
const Notifications = lazy(() => import("@/pages/notifications/Notifications"));
const ProjectDetails = lazy(() => import("@/pages/project-details/ProjectDetails"));
const CreateProject = lazy(() => import("@/pages/create-project/CreateProject"));
const PentestWorkspacePage = lazy(
  () => import("@/pages/pentest-workspace/PentestWorkspacePage")
);
const SecurityProjectBugsPage = lazy(
  () => import("@/pages/security-bugs/SecurityProjectBugsPage")
);
const SecurityBugDetailsPage = lazy(
  () => import("@/pages/security-bugs/SecurityBugDetailsPage")
);
const DevopsProjects = lazy(() => import("@/pages/devops-projects/DevopsProjects"));

export const protectedRouteConfig = [
  {
    path: ROUTE_ACCESS_POLICIES.dashboard.path,
    element: Dashboard,
    permissions: ROUTE_ACCESS_POLICIES.dashboard.permissions,
  },
  {
    path: ROUTE_ACCESS_POLICIES.adminUsers.path,
    element: AdminUsers,
    permissions: ROUTE_ACCESS_POLICIES.adminUsers.permissions,
  },
  {
    path: ROUTE_ACCESS_POLICIES.adminAuditLogs.path,
    element: AuditLogs,
    permissions: ROUTE_ACCESS_POLICIES.adminAuditLogs.permissions,
    roles: ROUTE_ACCESS_POLICIES.adminAuditLogs.roles,
  },
  {
    path: ROUTE_ACCESS_POLICIES.projects.path,
    element: Projects,
    permissions: ROUTE_ACCESS_POLICIES.projects.permissions,
  },
  {
    path: "/tasks",
    element: Tasks,
    permissions: [],
  },
  {
    path: "/notifications",
    element: Notifications,
    permissions: [],
  },
  {
    path: ROUTE_ACCESS_POLICIES.projectDetails.path,
    element: ProjectDetails,
    permissions: ROUTE_ACCESS_POLICIES.projectDetails.permissions,
  },
  {
    path: ROUTE_ACCESS_POLICIES.pentestWorkspace.path,
    element: PentestWorkspacePage,
    permissions: ROUTE_ACCESS_POLICIES.pentestWorkspace.permissions,
  },
  {
    path: ROUTE_ACCESS_POLICIES.securityProjectBugs.path,
    element: SecurityProjectBugsPage,
    permissions: ROUTE_ACCESS_POLICIES.securityProjectBugs.permissions,
  },
  {
    path: ROUTE_ACCESS_POLICIES.securityBugDetails.path,
    element: SecurityBugDetailsPage,
    permissions: ROUTE_ACCESS_POLICIES.securityBugDetails.permissions,
  },
  {
    path: ROUTE_ACCESS_POLICIES.createProject.path,
    element: CreateProject,
    permissions: ROUTE_ACCESS_POLICIES.createProject.permissions,
  },
  {
    path: ROUTE_ACCESS_POLICIES.profile.path,
    element: Profile,
    permissions: ROUTE_ACCESS_POLICIES.profile.permissions,
  },
  {
    path: ROUTE_ACCESS_POLICIES.settings.path,
    element: Settings,
    permissions: ROUTE_ACCESS_POLICIES.settings.permissions,
  },
  {
    path: "/admin",
    element: DashboardRedirect,
    permissions: [PERMISSIONS.ADMIN_DASHBOARD_READ],
  },
  {
    path: "/security-manager",
    element: DashboardRedirect,
    permissions: [PERMISSIONS.SECURITY_DASHBOARD_READ],
  },
  {
    path: "/pentester",
    element: DashboardRedirect,
    permissions: [PERMISSIONS.PENTEST_DASHBOARD_READ],
  },
  {
    path: ROUTE_ACCESS_POLICIES.devopsProjects.path,
    element: DevopsProjects,
    permissions: ROUTE_ACCESS_POLICIES.devopsProjects.permissions,
    roles: ROUTE_ACCESS_POLICIES.devopsProjects.roles,
  },
  {
    path: "/representative",
    element: DashboardRedirect,
    permissions: [PERMISSIONS.REPRESENTATIVE_DASHBOARD_READ],
  },
  {
    path: "/quality-manager",
    element: DashboardRedirect,
    permissions: [PERMISSIONS.QUALITY_DASHBOARD_READ],
  },
  {
    path: "/qa",
    element: DashboardRedirect,
    permissions: [PERMISSIONS.QA_DASHBOARD_READ],
  },
];
