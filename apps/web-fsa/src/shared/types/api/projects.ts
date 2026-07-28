import type {
  ProjectResponsibilityKey,
  ProjectResponsibilityContextContract,
  ProjectRowActionContract,
} from "@role-dashboard/contracts";

export type ProjectType = "security" | "quality";
export type ProjectPlatform = "web" | "mobile" | "desktop";
export type CertificateAuthority = "bank" | "afta" | "standards";

export type CreateProjectRequest = {
  projectName: string;
  sourceProjectId?: string;
  projectGroupId?: string;
  canonicalName?: string;
  version: string;
  letterNumber: string;
  type: ProjectType;
  platform: ProjectPlatform;
  certificateRequired: boolean;
  certificateAuthorities: CertificateAuthority[];
  projectManagerId?: string;
  qualityManagerId?: string;
  devopsManagerId: string;
  representativeId?: string;
  testEndDate: string;
};

export type CreateProjectResponse = CreateProjectRequest & {
  id: string;
  createdAt: string;
};

export type ProjectListView =
  | "admin"
  | "security"
  | "pentest"
  | "devops"
  | "quality"
  | "qa"
  | "representative";

export type ApiProjectResponse = {
  id: string;
  _id?: string;
  projectName: string;
  devopsInfo?: {
    environment?: string;
    repository?: string;
    pipeline?: string;
    deploymentUrl?: string;
    serverInventory?: string;
    releaseBranch?: string;
    notes?: string;
  };
  environment?: string;
  repository?: string;
  pipeline?: string;
  projectGroupId?: string;
  canonicalName?: string;
  version?: string;
  letterNumber?: string;
  type?: ProjectType | "devops";
  platform?: ProjectPlatform[] | ProjectPlatform | string[] | string;
  status?: string;
  ownerId?: string;
  projectManager?: string;
  qualityManager?: string;
  devops?: string;
  representative?: string;
  assignedUserIds?: string[];
  expireDay?: string;
  expireDayQuality?: string;
  testExpiresAt?: string;
  createdAt?: string;
  updatedAt?: string;
  provisioningStatus?:
    | "AWAITING_DEVOPS_SETUP"
    | "DEVOPS_IN_PROGRESS"
    | "DEVOPS_READY"
    | "DEVOPS_BLOCKED"
    | "READY_FOR_DEVOPS_RETRY";
  provisioningAttemptNumber?: number;
  provisioningHistory?: Array<{
    previousStatus: string;
    newStatus: string;
    actingUserId: string;
    actingUserRole: string;
    timestamp: string;
    notes?: string;
    failureReason?: string;
    technicalDescription?: string;
    recommendedAction?: string;
    resolutionMessage?: string;
    evidence?: string[];
    attemptNumber: number;
  }>;
  devopsConfirmedBy?: string;
  devopsConfirmedAt?: string;
  devopsNotes?: string;
  devopsFailureReason?: string;
  devopsFailureDescription?: string;
  devopsRecommendedAction?: string;
  devopsFailureEvidence?: string[];
  devopsFailureAt?: string;
  provisioningBlockedDurationMs?: number;
  devopsResolutionMessage?: string;
  devopsResolutionSubmittedAt?: string;
  devopsResolutionSubmittedBy?: string;
  allowedActions?: ProjectRowActionContract[];
  myResponsibilities?: ProjectResponsibilityKey[];
  responsibilityContext?: ProjectResponsibilityContextContract;
};
