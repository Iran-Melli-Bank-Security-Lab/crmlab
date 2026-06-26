export const ROUTES = {
  ROOT: "/",
  PARAM_ID: "/:id",
  HEALTH: "/api/health",
  UPLOADS_STATIC: "/uploads",

  AUTH: {
    BASE: "/api/auth",
    REGISTER: "/register",
    REGISTER_ADMIN: "/register-admin",
    LOGIN: "/login",
    CSRF_TOKEN: "/csrf-token",
    ME: "/me",
    REFRESH_TOKEN: "/refresh-token",
    LOGOUT: "/logout",
  },

  USERS: {
    BASE: "/api/users",
    ROLES: "/roles",
    ROLES_SYNC_PERMISSIONS: "/roles/sync-permissions",
    ROLE_PERMISSIONS: "/roles/:key/permissions",
    DETAIL: "/:userId",
    ROLES_PERMISSIONS: "/:id/roles-permissions",
  },

  AUDIT_LOGS: {
    BASE: "/api/audit-logs",
  },

  PROJECTS: {
    BASE: "/api/projects",
    ELIGIBLE_ASSIGNEES: "/:id/eligible-assignees",
    ASSIGN_USERS: "/:id/assign-users",
  },

  NOTIFICATIONS: {
    BASE: "/api/notifications",
    READ_ALL: "/read-all",
    READ: "/:id/read",
  },

  UPLOAD: {
    BASE: "/api/upload",
    AVATAR: "/avatar",
  },

  PENTEST: {
    BASE: "/api/pentest",
    VULNERABILITIES: "/vulnerabilities",
  },

  DEVOPS: {
    BASE: "/api/devops",
    DEPLOYMENTS: "/deployments",
    SERVERS: "/servers",
  },

  TICKETS: {
    BASE: "/api/tickets",
    STATUS: "/:id/status",
  },

  QA: {
    BASE: "/api/qa",
    TEST_CASES: "/test-cases",
    TEST_CASE_STATUS: "/test-cases/:id/status",
  },

  FRONTEND: {
    PROJECT_DETAILS: (projectId: string) => `/projects/${projectId}`,
    PENTESTER_DASHBOARD: "/pentester",
  },
} as const;

export const API_ENDPOINTS = {
  HEALTH: ROUTES.HEALTH,
  AUTH_REGISTER: `${ROUTES.AUTH.BASE}${ROUTES.AUTH.REGISTER}`,
  AUTH_REGISTER_ADMIN: `${ROUTES.AUTH.BASE}${ROUTES.AUTH.REGISTER_ADMIN}`,
  AUTH_LOGIN: `${ROUTES.AUTH.BASE}${ROUTES.AUTH.LOGIN}`,
  AUTH_CSRF_TOKEN: `${ROUTES.AUTH.BASE}${ROUTES.AUTH.CSRF_TOKEN}`,
  AUTH_ME: `${ROUTES.AUTH.BASE}${ROUTES.AUTH.ME}`,
  AUTH_REFRESH_TOKEN: `${ROUTES.AUTH.BASE}${ROUTES.AUTH.REFRESH_TOKEN}`,
  AUTH_LOGOUT: `${ROUTES.AUTH.BASE}${ROUTES.AUTH.LOGOUT}`,
} as const;
