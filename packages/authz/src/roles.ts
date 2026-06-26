export const ROLES = {
  ADMIN: "admin",
  PENTESTER: "pentester",
  DEVOPS: "devops",
  REPRESENTATIVE: "representative",
  QA: "qa",
  SECURITY_PROJECT_MANAGER: "project_manager_security",
  PROJECT_MANAGER_SECURITY: "project_manager_security",
  QUALITY_PROJECT_MANAGER: "project_manager_qa",
  PROJECT_MANAGER_QA: "project_manager_qa",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ALL_ROLES = Array.from(new Set(Object.values(ROLES)));
