export const PERMISSION_DOMAINS = [
  "admin",
  "security",
  "pentest",
  "quality",
  "qa",
  "devops",
  "representative",
] as const;

export const PERMISSION_ACTIONS = [
  "read",
  "create",
  "update",
  "delete",
  "manage",
  "assign",
  "review",
  "approve",
  "reject",
  "submit",
  "export",
] as const;

export const PERMISSION_SCOPES = ["all", "assigned", "own", "self"] as const;

export type PermissionDomain = (typeof PERMISSION_DOMAINS)[number];
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];
export type PermissionScope = (typeof PERMISSION_SCOPES)[number];

export type PermissionDefinition = {
  key: string;
  domain: PermissionDomain;
  resource: string;
  action: PermissionAction;
  scope: PermissionScope;
  description: string;
};

export const PERMISSIONS = {
  ADMIN_SYSTEM_MANAGE: "admin.system.manage.all",
  ADMIN_DASHBOARD_READ: "admin.dashboard.read.all",
  ADMIN_USERS_READ: "admin.users.read.all",
  ADMIN_USERS_CREATE: "admin.users.create.all",
  ADMIN_USERS_UPDATE: "admin.users.update.all",
  ADMIN_USERS_DELETE: "admin.users.delete.all",
  ADMIN_ROLES_READ: "admin.roles.read.all",
  ADMIN_ROLES_UPDATE: "admin.roles.update.all",
  ADMIN_AUDIT_READ: "admin.audit.read.all",
  ADMIN_PROJECTS_CREATE: "admin.projects.create.all",

  SECURITY_DASHBOARD_READ: "security.dashboard.read.assigned",
  SECURITY_PROJECTS_READ: "security.projects.read.assigned",
  SECURITY_PROJECTS_UPDATE: "security.projects.update.assigned",
  SECURITY_PROJECTS_ASSIGN: "security.projects.assign.assigned",
  SECURITY_PROJECTS_ASSIGN_SELF: "security.projects.assign.self",
  SECURITY_PROJECTS_MANAGE: "security.projects.manage.assigned",
  SECURITY_PENTESTS_READ: "security.pentests.read.assigned",
  SECURITY_VULNERABILITIES_READ: "security.vulnerabilities.read.assigned",
  SECURITY_FINDINGS_REVIEW: "security.findings.review.assigned",
  SECURITY_FINDINGS_APPROVE: "security.findings.approve.assigned",
  SECURITY_FINDINGS_REJECT: "security.findings.reject.assigned",
  SECURITY_REPORTS_CREATE: "security.reports.create.assigned",
  SECURITY_REPORTS_SUBMIT: "security.reports.submit.assigned",
  SECURITY_REPORTS_EXPORT: "security.reports.export.assigned",

  PENTEST_DASHBOARD_READ: "pentest.dashboard.read.own",
  PENTEST_PROJECTS_READ: "pentest.projects.read.assigned",
  PENTEST_VULNERABILITIES_READ: "pentest.vulnerabilities.read.assigned",
  PENTEST_VULNERABILITIES_CREATE: "pentest.vulnerabilities.create.assigned",
  PENTEST_VULNERABILITIES_UPDATE: "pentest.vulnerabilities.update.assigned",
  PENTEST_VULNERABILITIES_DELETE: "pentest.vulnerabilities.delete.assigned",
  PENTEST_REPORTS_EXPORT: "pentest.reports.export.assigned",

  DEVOPS_DASHBOARD_READ: "devops.dashboard.read.assigned",
  DEVOPS_PROJECTS_READ: "devops.projects.read.assigned",
  DEVOPS_DEPLOYMENTS_READ: "devops.deployments.read.assigned",
  DEVOPS_DEPLOYMENTS_CREATE: "devops.deployments.create.assigned",
  DEVOPS_SERVERS_READ: "devops.servers.read.assigned",

  REPRESENTATIVE_DASHBOARD_READ: "representative.dashboard.read.own",
  REPRESENTATIVE_PROJECTS_READ: "representative.projects.read.own",
  REPRESENTATIVE_TICKETS_READ: "representative.tickets.read.own",
  REPRESENTATIVE_TICKETS_CREATE: "representative.tickets.create.own",
  REPRESENTATIVE_TICKETS_UPDATE: "representative.tickets.update.own",

  QUALITY_DASHBOARD_READ: "quality.dashboard.read.assigned",
  QUALITY_PROJECTS_READ: "quality.projects.read.assigned",
  QUALITY_PROJECTS_UPDATE: "quality.projects.update.assigned",
  QUALITY_PROJECTS_ASSIGN: "quality.projects.assign.assigned",
  QUALITY_PROJECTS_ASSIGN_SELF: "quality.projects.assign.self",
  QUALITY_PROJECTS_MANAGE: "quality.projects.manage.assigned",
  QUALITY_QA_READ: "quality.qa.read.assigned",
  QUALITY_TEST_CASES_READ: "quality.test-cases.read.assigned",
  QUALITY_TEST_CASES_UPDATE: "quality.test-cases.update.assigned",
  QUALITY_RESULTS_REVIEW: "quality.results.review.assigned",
  QUALITY_RESULTS_APPROVE: "quality.results.approve.assigned",
  QUALITY_RESULTS_REJECT: "quality.results.reject.assigned",
  QUALITY_REPORTS_CREATE: "quality.reports.create.assigned",
  QUALITY_REPORTS_SUBMIT: "quality.reports.submit.assigned",

  QA_DASHBOARD_READ: "qa.dashboard.read.own",
  QA_PROJECTS_READ: "qa.projects.read.assigned",
  QA_TEST_CASES_READ: "qa.test-cases.read.assigned",
  QA_TEST_CASES_CREATE: "qa.test-cases.create.assigned",
  QA_TEST_CASES_UPDATE: "qa.test-cases.update.assigned",
  QA_VULNERABILITIES_READ: "qa.vulnerabilities.read.assigned",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const PERMISSION_KEY_PATTERN =
  /^[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*$/;

export const PERMISSION_REGISTRY: PermissionDefinition[] = [
  ["ADMIN_SYSTEM_MANAGE", "admin", "system", "manage", "all", "Full system administration access."],
  ["ADMIN_DASHBOARD_READ", "admin", "dashboard", "read", "all", "Read the admin dashboard."],
  ["ADMIN_USERS_READ", "admin", "users", "read", "all", "Read all users."],
  ["ADMIN_USERS_CREATE", "admin", "users", "create", "all", "Create users."],
  ["ADMIN_USERS_UPDATE", "admin", "users", "update", "all", "Update users."],
  ["ADMIN_USERS_DELETE", "admin", "users", "delete", "all", "Delete users."],
  ["ADMIN_ROLES_READ", "admin", "roles", "read", "all", "Read roles and role permissions."],
  ["ADMIN_ROLES_UPDATE", "admin", "roles", "update", "all", "Update role permissions."],
  ["ADMIN_AUDIT_READ", "admin", "audit", "read", "all", "Read audit logs."],
  ["ADMIN_PROJECTS_CREATE", "admin", "projects", "create", "all", "Create projects."],

  ["SECURITY_DASHBOARD_READ", "security", "dashboard", "read", "assigned", "Read the security dashboard."],
  ["SECURITY_PROJECTS_READ", "security", "projects", "read", "assigned", "Read assigned security projects."],
  ["SECURITY_PROJECTS_UPDATE", "security", "projects", "update", "assigned", "Update assigned security projects."],
  ["SECURITY_PROJECTS_ASSIGN", "security", "projects", "assign", "assigned", "Assign users to assigned security projects."],
  ["SECURITY_PROJECTS_ASSIGN_SELF", "security", "projects", "assign", "self", "Self-assign security project work."],
  ["SECURITY_PROJECTS_MANAGE", "security", "projects", "manage", "assigned", "Manage assigned security projects."],
  ["SECURITY_PENTESTS_READ", "security", "pentests", "read", "assigned", "Read pentest work in assigned security projects."],
  ["SECURITY_VULNERABILITIES_READ", "security", "vulnerabilities", "read", "assigned", "Read vulnerabilities in assigned security projects."],
  ["SECURITY_FINDINGS_REVIEW", "security", "findings", "review", "assigned", "Review security findings."],
  ["SECURITY_FINDINGS_APPROVE", "security", "findings", "approve", "assigned", "Approve security findings."],
  ["SECURITY_FINDINGS_REJECT", "security", "findings", "reject", "assigned", "Reject security findings."],
  ["SECURITY_REPORTS_CREATE", "security", "reports", "create", "assigned", "Create security reports."],
  ["SECURITY_REPORTS_SUBMIT", "security", "reports", "submit", "assigned", "Submit security reports."],
  ["SECURITY_REPORTS_EXPORT", "security", "reports", "export", "assigned", "Export security reports."],

  ["PENTEST_DASHBOARD_READ", "pentest", "dashboard", "read", "own", "Read the pentester dashboard."],
  ["PENTEST_PROJECTS_READ", "pentest", "projects", "read", "assigned", "Read assigned pentest projects."],
  ["PENTEST_VULNERABILITIES_READ", "pentest", "vulnerabilities", "read", "assigned", "Read assigned vulnerabilities."],
  ["PENTEST_VULNERABILITIES_CREATE", "pentest", "vulnerabilities", "create", "assigned", "Create vulnerabilities in assigned projects."],
  ["PENTEST_VULNERABILITIES_UPDATE", "pentest", "vulnerabilities", "update", "assigned", "Update vulnerabilities in assigned projects."],
  ["PENTEST_VULNERABILITIES_DELETE", "pentest", "vulnerabilities", "delete", "assigned", "Delete vulnerabilities in assigned projects."],
  ["PENTEST_REPORTS_EXPORT", "pentest", "reports", "export", "assigned", "Export pentest reports."],

  ["DEVOPS_DASHBOARD_READ", "devops", "dashboard", "read", "assigned", "Read the DevOps dashboard."],
  ["DEVOPS_PROJECTS_READ", "devops", "projects", "read", "assigned", "Read assigned delivery projects."],
  ["DEVOPS_DEPLOYMENTS_READ", "devops", "deployments", "read", "assigned", "Read deployments."],
  ["DEVOPS_DEPLOYMENTS_CREATE", "devops", "deployments", "create", "assigned", "Create deployments."],
  ["DEVOPS_SERVERS_READ", "devops", "servers", "read", "assigned", "Read servers."],

  ["REPRESENTATIVE_DASHBOARD_READ", "representative", "dashboard", "read", "own", "Read the representative dashboard."],
  ["REPRESENTATIVE_PROJECTS_READ", "representative", "projects", "read", "own", "Read own customer projects."],
  ["REPRESENTATIVE_TICKETS_READ", "representative", "tickets", "read", "own", "Read own tickets."],
  ["REPRESENTATIVE_TICKETS_CREATE", "representative", "tickets", "create", "own", "Create own tickets."],
  ["REPRESENTATIVE_TICKETS_UPDATE", "representative", "tickets", "update", "own", "Update own tickets."],

  ["QUALITY_DASHBOARD_READ", "quality", "dashboard", "read", "assigned", "Read the quality dashboard."],
  ["QUALITY_PROJECTS_READ", "quality", "projects", "read", "assigned", "Read assigned quality projects."],
  ["QUALITY_PROJECTS_UPDATE", "quality", "projects", "update", "assigned", "Update assigned quality projects."],
  ["QUALITY_PROJECTS_ASSIGN", "quality", "projects", "assign", "assigned", "Assign users to assigned quality projects."],
  ["QUALITY_PROJECTS_ASSIGN_SELF", "quality", "projects", "assign", "self", "Self-assign quality project work."],
  ["QUALITY_PROJECTS_MANAGE", "quality", "projects", "manage", "assigned", "Manage assigned quality projects."],
  ["QUALITY_QA_READ", "quality", "qa", "read", "assigned", "Read QA work in assigned quality projects."],
  ["QUALITY_TEST_CASES_READ", "quality", "test-cases", "read", "assigned", "Read test cases in assigned quality projects."],
  ["QUALITY_TEST_CASES_UPDATE", "quality", "test-cases", "update", "assigned", "Update test cases in assigned quality projects."],
  ["QUALITY_RESULTS_REVIEW", "quality", "results", "review", "assigned", "Review quality results."],
  ["QUALITY_RESULTS_APPROVE", "quality", "results", "approve", "assigned", "Approve quality results."],
  ["QUALITY_RESULTS_REJECT", "quality", "results", "reject", "assigned", "Reject quality results."],
  ["QUALITY_REPORTS_CREATE", "quality", "reports", "create", "assigned", "Create quality reports."],
  ["QUALITY_REPORTS_SUBMIT", "quality", "reports", "submit", "assigned", "Submit quality reports."],

  ["QA_DASHBOARD_READ", "qa", "dashboard", "read", "own", "Read the QA dashboard."],
  ["QA_PROJECTS_READ", "qa", "projects", "read", "assigned", "Read assigned QA projects."],
  ["QA_TEST_CASES_READ", "qa", "test-cases", "read", "assigned", "Read assigned test cases."],
  ["QA_TEST_CASES_CREATE", "qa", "test-cases", "create", "assigned", "Create assigned test cases."],
  ["QA_TEST_CASES_UPDATE", "qa", "test-cases", "update", "assigned", "Update assigned test cases."],
  ["QA_VULNERABILITIES_READ", "qa", "vulnerabilities", "read", "assigned", "Read vulnerabilities related to assigned QA work."],
].map(([code, domain, resource, action, scope, description]) => ({
  key: PERMISSIONS[code as keyof typeof PERMISSIONS],
  domain: domain as PermissionDomain,
  resource,
  action: action as PermissionAction,
  scope: scope as PermissionScope,
  description,
}));

export const ALL_PERMISSIONS = PERMISSION_REGISTRY.map(
  (permission) => permission.key
) as Permission[];

export const LEGACY_PERMISSION_ALIASES: Record<string, Permission> = {
  "qa.testcases.read.assigned": PERMISSIONS.QA_TEST_CASES_READ,
  "qa.testcases.create.assigned": PERMISSIONS.QA_TEST_CASES_CREATE,
  "qa.testcases.update.assigned": PERMISSIONS.QA_TEST_CASES_UPDATE,
  "quality.testcases.read.assigned": PERMISSIONS.QUALITY_TEST_CASES_READ,
  "quality.testcases.update.assigned": PERMISSIONS.QUALITY_TEST_CASES_UPDATE,
};

export function normalizePermissionKey(value: string): Permission | undefined {
  const canonical = LEGACY_PERMISSION_ALIASES[value] || value;
  return ALL_PERMISSIONS.includes(canonical as Permission)
    ? (canonical as Permission)
    : undefined;
}

export function isPermissionKey(value: string): value is Permission {
  return (
    PERMISSION_KEY_PATTERN.test(value) &&
    normalizePermissionKey(value) === value
  );
}
