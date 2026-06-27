import type {
  ApiErrorContract,
  AuthResponseContract,
  RoleCatalogItemContract,
  RolesAndPermissionsContract,
  UploadResponseContract,
  UserContract,
  UserFormPayloadContract,
  UserStatus as ContractUserStatus,
} from "@role-dashboard/contracts";
import type { ProjectPlatform as ApiProjectPlatform } from "@/shared/types/api/projects";
import type {
  Permission as AuthzPermission,
  Role as AuthzRole,
} from "@role-dashboard/authz";

export type {
  CertificateAuthority,
  CreateProjectRequest,
  CreateProjectResponse,
  ProjectPlatform,
  ProjectType,
} from "@/shared/types/api/projects";

export type Role = AuthzRole;
export type Permission = AuthzPermission;
export type UserStatus = ContractUserStatus;
export type RoleCatalogItem = RoleCatalogItemContract;
export type RolesAndPermissions = RolesAndPermissionsContract;
export type User = UserContract;
export type AuthResponse = AuthResponseContract;
export type UploadResponse = UploadResponseContract;
export type ApiError = ApiErrorContract;
export type UserFormPayload = UserFormPayloadContract;

export type ProjectStatus = "planning" | "active" | "blocked" | "review" | "completed";
export type ProjectPriority = "low" | "medium" | "high" | "critical";
export type ProjectDiscipline = "security" | "quality" | "devops" | "platform";
export type ProjectAssignmentRole = "pentester" | "qa" | "devops" | "manager";
export type ProjectAssignmentStatus =
  | "assigned"
  | "in_progress"
  | "submitted"
  | "changes_requested"
  | "accepted";

export type Project = {
  id: string;
  name: string;
  client: string;
  projectGroupId?: string;
  canonicalName?: string;
  createdByUserId?: string;
  securityManagerId?: string;
  qualityManagerId?: string;
  devopsAssigneeId?: string;
  representativeId?: string;
  assignedUserIds?: string[];
  version?: string;
  letterNumber?: string;
  platform?: ApiProjectPlatform | string;
  createdAt?: string;
  testExpiresAt?: string;
  discipline: ProjectDiscipline;
  status: ProjectStatus;
  priority: ProjectPriority;
  owner: string;
  assignee: string;
  dueDate: string;
  progress: number;
  riskScore: number;
  vulnerabilities: number;
  testCoverage: number;
  openBugs: number;
  environment: string;
  repository: string;
  pipeline: string;
  devopsInfo?: {
    environment?: string;
    repository?: string;
    pipeline?: string;
    deploymentUrl?: string;
    serverInventory?: string;
    releaseBranch?: string;
    notes?: string;
  };
  lastActivity: string;
};

export type ProjectAssignment = Project & {
  assignmentId: string;
  assignedUserId?: string;
  assignmentRole: ProjectAssignmentRole;
  assignmentStatus: ProjectAssignmentStatus;
  assignedAt: string;
  assignmentDueDate: string;
  reviewer: string;
  scope: string;
  phase: string;
  submittedItems: number;
};
