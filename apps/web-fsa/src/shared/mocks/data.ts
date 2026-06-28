import { PERMISSIONS } from "@/entities/permission/model/permissions";
import { ROLES } from "@/entities/permission/model/roles";
import type { AppNotification } from "@/entities/notification/model/notification";
import type { Role, RoleCatalogItem, User } from "@/shared/types";

export const mockRoleCatalog: RoleCatalogItem[] = [
  {
    id: "role-admin",
    key: ROLES.ADMIN,
    name: "Admin",
    permissions: [
      PERMISSIONS.ADMIN_SYSTEM_MANAGE,
      PERMISSIONS.ADMIN_DASHBOARD_READ,
      PERMISSIONS.ADMIN_USERS_READ,
      PERMISSIONS.ADMIN_USERS_CREATE,
      PERMISSIONS.ADMIN_USERS_UPDATE,
      PERMISSIONS.ADMIN_USERS_DELETE,
      PERMISSIONS.ADMIN_ROLES_READ,
      PERMISSIONS.ADMIN_ROLES_UPDATE,
      PERMISSIONS.ADMIN_AUDIT_READ,
      PERMISSIONS.ADMIN_PROJECTS_CREATE,
    ],
    isSystem: true,
  },
  {
    id: "role-pentester",
    key: ROLES.PENTESTER,
    name: "Pentester",
    permissions: [
      PERMISSIONS.PENTEST_DASHBOARD_READ,
      PERMISSIONS.PENTEST_PROJECTS_READ,
      PERMISSIONS.PENTEST_VULNERABILITIES_READ,
      PERMISSIONS.PENTEST_VULNERABILITIES_CREATE,
      PERMISSIONS.PENTEST_VULNERABILITIES_UPDATE,
      PERMISSIONS.PENTEST_REPORTS_EXPORT,
    ],
    isSystem: true,
  },
  {
    id: "role-security-project-manager",
    key: ROLES.SECURITY_PROJECT_MANAGER,
    name: "Security Project Manager",
    permissions: [
      PERMISSIONS.SECURITY_DASHBOARD_READ,
      PERMISSIONS.SECURITY_PROJECTS_READ,
      PERMISSIONS.SECURITY_PROJECTS_ASSIGN,
      PERMISSIONS.SECURITY_PROJECTS_ASSIGN_SELF,
      PERMISSIONS.SECURITY_FINDINGS_REVIEW,
      PERMISSIONS.SECURITY_FINDINGS_APPROVE,
      PERMISSIONS.SECURITY_FINDINGS_REJECT,
      PERMISSIONS.SECURITY_REPORTS_CREATE,
      PERMISSIONS.SECURITY_REPORTS_SUBMIT,
      PERMISSIONS.PENTEST_DASHBOARD_READ,
      PERMISSIONS.PENTEST_VULNERABILITIES_READ,
      PERMISSIONS.PENTEST_VULNERABILITIES_CREATE,
      PERMISSIONS.PENTEST_VULNERABILITIES_UPDATE,
    ],
    isSystem: true,
  },
  {
    id: "role-devops",
    key: ROLES.DEVOPS,
    name: "DevOps",
    permissions: [
      PERMISSIONS.DEVOPS_DASHBOARD_READ,
      PERMISSIONS.DEVOPS_PROJECTS_READ,
      PERMISSIONS.DEVOPS_DEPLOYMENTS_READ,
      PERMISSIONS.DEVOPS_DEPLOYMENTS_CREATE,
      PERMISSIONS.DEVOPS_SERVERS_READ,
    ],
    isSystem: true,
  },
  {
    id: "role-representative",
    key: ROLES.REPRESENTATIVE,
    name: "Representative",
    permissions: [
      PERMISSIONS.REPRESENTATIVE_DASHBOARD_READ,
      PERMISSIONS.REPRESENTATIVE_PROJECTS_READ,
      PERMISSIONS.REPRESENTATIVE_TICKETS_READ,
      PERMISSIONS.REPRESENTATIVE_TICKETS_CREATE,
      PERMISSIONS.REPRESENTATIVE_TICKETS_UPDATE,
    ],
    isSystem: true,
  },
  {
    id: "role-qa",
    key: ROLES.QA,
    name: "Quality Assurance",
    permissions: [
      PERMISSIONS.QA_DASHBOARD_READ,
      PERMISSIONS.QA_PROJECTS_READ,
      PERMISSIONS.QA_TEST_CASES_READ,
      PERMISSIONS.QA_TEST_CASES_CREATE,
      PERMISSIONS.QA_TEST_CASES_UPDATE,
      PERMISSIONS.PENTEST_VULNERABILITIES_READ,
    ],
    isSystem: true,
  },
  {
    id: "role-quality-project-manager",
    key: ROLES.QUALITY_PROJECT_MANAGER,
    name: "Quality Project Manager",
    permissions: [
      PERMISSIONS.QUALITY_DASHBOARD_READ,
      PERMISSIONS.QUALITY_PROJECTS_READ,
      PERMISSIONS.QUALITY_PROJECTS_ASSIGN,
      PERMISSIONS.QUALITY_PROJECTS_ASSIGN_SELF,
      PERMISSIONS.QUALITY_RESULTS_REVIEW,
      PERMISSIONS.QUALITY_RESULTS_APPROVE,
      PERMISSIONS.QUALITY_RESULTS_REJECT,
      PERMISSIONS.QUALITY_REPORTS_CREATE,
      PERMISSIONS.QUALITY_REPORTS_SUBMIT,
      PERMISSIONS.QA_DASHBOARD_READ,
      PERMISSIONS.QA_TEST_CASES_READ,
      PERMISSIONS.QA_TEST_CASES_CREATE,
      PERMISSIONS.QA_TEST_CASES_UPDATE,
      PERMISSIONS.PENTEST_VULNERABILITIES_READ,
    ],
    isSystem: true,
  },
];

export function getMockPermissionsFromRoles(roles: Role[]) {
  return Array.from(
    new Set(
      roles.flatMap(
        (role) => mockRoleCatalog.find((item) => item.key === role)?.permissions || []
      )
    )
  );
}

export let mockUsers: User[] = [
  {
    id: "1",
    name: "Admin User",
    firstName: "Admin",
    lastName: "User",
    username: "admin.user",
    roles: [ROLES.ADMIN],
    permissions: getMockPermissionsFromRoles([ROLES.ADMIN]),
    status: "Active",
    avatarUrl: "https://placehold.co/128x128?text=AU",
  },
  {
    id: "2",
    name: "Pentester QA",
    firstName: "Pentester",
    lastName: "QA",
    username: "pentest.qa",
    roles: [ROLES.PENTESTER, ROLES.QA],
    permissions: getMockPermissionsFromRoles([ROLES.PENTESTER, ROLES.QA]),
    status: "Active",
    avatarUrl: "https://placehold.co/128x128?text=PQ",
  },
  {
    id: "3",
    name: "DevOps User",
    firstName: "DevOps",
    lastName: "User",
    username: "devops.user",
    roles: [ROLES.DEVOPS],
    permissions: getMockPermissionsFromRoles([ROLES.DEVOPS]),
    status: "Active",
    avatarUrl: "https://placehold.co/128x128?text=DU",
  },
  {
    id: "4",
    name: "Security Project Manager",
    firstName: "Security",
    lastName: "Project Manager",
    username: "security.pm",
    roles: [ROLES.SECURITY_PROJECT_MANAGER],
    permissions: getMockPermissionsFromRoles([ROLES.SECURITY_PROJECT_MANAGER]),
    status: "Active",
    avatarUrl: "https://placehold.co/128x128?text=SPM",
  },
  {
    id: "5",
    name: "Quality Project Manager",
    firstName: "Quality",
    lastName: "Project Manager",
    username: "quality.pm",
    roles: [ROLES.QUALITY_PROJECT_MANAGER],
    permissions: getMockPermissionsFromRoles([ROLES.QUALITY_PROJECT_MANAGER]),
    status: "Inactive",
    avatarUrl: "https://placehold.co/128x128?text=QPM",
  },
  {
    id: "6",
    name: "Representative User",
    firstName: "Representative",
    lastName: "User",
    username: "representative.user",
    roles: [ROLES.REPRESENTATIVE],
    permissions: getMockPermissionsFromRoles([ROLES.REPRESENTATIVE]),
    status: "Active",
    avatarUrl: "https://placehold.co/128x128?text=RU",
  },
];

export function resetMockUsers() {
  mockUsers = mockUsers.slice(0, 6);
}

export function upsertMockUser(user: User) {
  const index = mockUsers.findIndex((item) => item.id === user.id);
  if (index >= 0) mockUsers[index] = user;
  else mockUsers.push(user);
  return user;
}

export let mockNotifications: AppNotification[] = [
  {
    id: "n1",
    type: "project.assigned",
    title: "Security project assigned",
    message: "A new security assessment has been assigned to your team.",
    priority: "high",
    isRead: false,
    createdAt: new Date().toISOString(),
    entity: { id: "p1", type: "project", label: "Security Assessment" },
    projectId: "prj-001",
    actionUrl: "/projects/prj-001",
  },
  {
    id: "n2",
    type: "qa.result.submitted",
    title: "QA result submitted",
    message: "A QA member submitted test results for review.",
    priority: "medium",
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    entity: { id: "q1", type: "qa_result", label: "Regression Cycle" },
    projectId: "prj-002",
    actionUrl: "/projects/prj-002",
  },
];

export function markMockNotificationRead(id: string) {
  const notification = mockNotifications.find((item) => item.id === id);
  if (notification) notification.isRead = true;
  return notification;
}

export function markAllMockNotificationsRead() {
  mockNotifications = mockNotifications.map((item) => ({ ...item, isRead: true }));
}
