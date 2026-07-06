export const PROJECT_SECURITY_TARGET_TYPES = [
  "web",
  "api",
  "mobile",
  "desktop",
  "hardware",
  "blockchain",
  "ai",
  "other",
] as const;

export const SECURITY_SCOPE_MODES = ["all", "custom"] as const;

export const DEFAULT_WEB_SECURITY_STANDARD = {
  standardKey: "owasp-wstg",
  standardVersion: "4.2",
} as const;

export type ProjectSecurityTargetType = (typeof PROJECT_SECURITY_TARGET_TYPES)[number];
export type SecurityScopeMode = (typeof SECURITY_SCOPE_MODES)[number];

export type SecurityScopeReference = {
  standardKey: string;
  standardVersion: string;
  scopeMode: SecurityScopeMode;
  selectedNodeIds: string[];
};
