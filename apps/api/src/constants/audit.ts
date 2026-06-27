export const AUDIT_ACTIONS = {
  AUTH_REGISTER: "auth.register",
  AUTH_LOGIN: "auth.login",
  AUTH_REFRESH: "auth.refresh",
  AUTH_LOGOUT: "auth.logout",
  USER_CREATE: "user.create",
  USER_ROLES_UPDATE: "user.roles_update",
  PROJECT_CREATE: "project.create",
  PROJECT_ASSIGN_USERS: "project.assign_users",
  PENTEST_WORK_SESSION_CREATE: "pentest.work_session_create",
  VULNERABILITY_CREATE: "vulnerability.create",
  NOTIFICATION_MARK_READ: "notification.mark_read",
  NOTIFICATION_MARK_ALL_READ: "notification.mark_all_read",
  NOTIFICATION_DELETE: "notification.delete",
  USER_DELETE: "user.delete",
  UPLOAD_AVATAR: "upload.avatar",
  UPLOAD_DELETE: "upload.delete",
} as const;

export const AUDIT_ENTITY_TYPES = {
  USER: "user",
  PROJECT: "project",
  VULNERABILITY: "vulnerability",
  NOTIFICATION: "notification",
  UPLOAD: "upload",
  SESSION: "session",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];
export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[keyof typeof AUDIT_ENTITY_TYPES];
