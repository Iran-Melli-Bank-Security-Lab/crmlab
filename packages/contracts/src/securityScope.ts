export type ProjectSecurityTargetType =
  | "web"
  | "api"
  | "mobile"
  | "desktop"
  | "hardware"
  | "blockchain"
  | "ai"
  | "other";

export type SecurityScopeMode = "all" | "custom";

export type SecurityScopeReferenceContract = {
  standardKey: string;
  standardVersion: string;
  scopeMode: SecurityScopeMode;
  selectedNodeIds: string[];
};

export type SecurityStandardSummaryContract = {
  id: string;
  standardKey: string;
  name: string;
  shortName: string;
  version: string;
  type: ProjectSecurityTargetType | "sdlc";
  isActive: boolean;
};

export type SecurityStandardNodeContract = {
  nodeId: string;
  label: string;
  labelFa?: string;
  description?: string;
  impact?: string;
  exploit?: string;
  exploitFa?: string;
  solution?: string;
  code?: string;
  referenceUrl?: string;
  order: number;
  children: SecurityStandardNodeContract[];
};

export type SecurityStandardTreeContract = SecurityStandardSummaryContract & {
  nodes: SecurityStandardNodeContract[];
};

export type ProjectSecurityScopeContract = SecurityScopeReferenceContract & {
  id: string;
  projectId: string;
  targetType: ProjectSecurityTargetType;
  effectiveSelectedNodeIds: string[];
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
};

export type PentesterScopeAssignmentContract = {
  userId: string;
  securityScope: SecurityScopeReferenceContract;
};

export type ProjectSecurityStandardsContract = {
  targetType: ProjectSecurityTargetType;
  standards: SecurityStandardSummaryContract[];
};

export type ProjectPentesterScopesContract = {
  assignedUserIds: string[];
  pentesterScopes: PentesterScopeAssignmentContract[];
};

export type AssignedSecurityStandardNodeContract = {
  nodeId: string;
  code?: string;
  label: string;
  labelFa?: string;
  description?: string;
  order: number;
  isSelectable: boolean;
  pathNodeIds: string[];
  pathLabels: string[];
  pathLabelsFa: string[];
  assessment?: {
    status: ItemAssessmentStatusContract;
    linkedVulnerabilityCount: number;
    hasSubmittedVulnerability: boolean;
  };
  children: AssignedSecurityStandardNodeContract[];
};

export type ItemAssessmentStatusContract =
  | "PASS"
  | "FAILED"
  | "NOT_ACCESSIBLE"
  | "NOT_APPLICABLE";

export type ItemAssessmentProgressContract = {
  completedItems: number;
  totalItems: number;
  percentage: number;
};

export type ItemAssessmentContract = {
  id: string;
  projectId: string;
  standardId: string;
  itemId: string;
  status: ItemAssessmentStatusContract;
  linkedVulnerabilityIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type SaveItemAssessmentResponseContract = {
  assessment: ItemAssessmentContract;
  progress: ItemAssessmentProgressContract;
};

export type AssignedSecurityStandardContract = {
  id: string;
  standardKey: string;
  name: string;
  shortName: string;
  version: string;
  type: ProjectSecurityTargetType | "sdlc";
  nodes: AssignedSecurityStandardNodeContract[];
};

export type AssignedSecurityStandardsContract = {
  projectId: string;
  standards: AssignedSecurityStandardContract[];
  progress: ItemAssessmentProgressContract;
};
