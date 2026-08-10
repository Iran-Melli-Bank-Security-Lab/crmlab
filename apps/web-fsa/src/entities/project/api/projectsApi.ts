import { api } from "@/shared/api/baseApi";
import type { Project, User } from "@/shared/types";
import type {
  ApiProjectResponse,
  CreateProjectRequest,
  CreateProjectResponse,
  ProjectListView,
} from "@/shared/types/api/projects";
import type {
  PentesterScopeAssignmentContract,
  ProjectPentesterScopesContract,
  ProjectSecurityScopeContract,
  ProjectSecurityStandardsContract,
  SecurityStandardTreeContract,
} from "@role-dashboard/contracts";
import { unwrapApiData } from "@/shared/api/unwrapApiData";

type ProjectResponse =
  | CreateProjectResponse
  | { data?: CreateProjectResponse; project?: CreateProjectResponse };
type ProjectDetailResponse =
  | ApiProjectResponse
  | { data?: ApiProjectResponse; project?: ApiProjectResponse };
type ProjectListResponse =
  | ApiProjectResponse[]
  | { data?: ApiProjectResponse[]; projects?: ApiProjectResponse[] };
type UsersResponse = User[] | { users?: User[]; items?: User[]; data?: User[] };

export type ProjectBugVisibilitySettings = {
  timeRequirementEnabled: boolean;
  requiredHours: number;
  userOverrides: Array<{ userId: string; requiredHours: number }>;
  eligiblePentesters: Array<{ userId: string; name: string; username?: string }>;
};

export type DeadlineExtensionRequest = {
  id: string;
  requestedBy: string;
  requestedAt: string;
  message?: string;
  requestType: "individual" | "project";
  isOwn: boolean;
  currentDeadline?: string;
  requestedDeadline?: string;
  status:
    | "pending"
    | "pending_technical_review"
    | "rejected_by_technical_manager"
    | "pending_admin_review"
    | "approved"
    | "rejected"
    | "rejected_by_admin"
    | "cancelled";
  reviewedBy?: string;
  reviewedAt?: string;
  approvedDeadline?: string;
  reviewNote?: string;
  technicalReviewNote?: string;
  adminReviewNote?: string;
  requester?: { name: string; username?: string };
  actions?: Array<"approve" | "reject" | "forward">;
};

function normalizeUsersResponse(response: UsersResponse): User[] {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.users)) return response.users;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.data)) return response.data;
  return [];
}

function normalizeProjectResponse(response: ProjectResponse): CreateProjectResponse {
  if ("project" in response && response.project) return response.project;
  if ("data" in response && response.data) return response.data;
  return response as CreateProjectResponse;
}

function getPlatform(value: ApiProjectResponse["platform"]) {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

function normalizeStatus(value: string | undefined): Project["status"] {
  switch (value) {
    case "in_progress":
      return "active";
    case "pending":
      return "review";
    case "finished":
      return "completed";
    case "removed":
      return "blocked";
    case "open":
    default:
      return "planning";
  }
}

function normalizeVisibleStatus(project: ApiProjectResponse): Project["status"] {
  const responsibilities =
    project.responsibilityContext?.responsibilityKeys || project.myResponsibilities || [];
  const usePentesterLifecycle =
    responsibilities.includes("pentester") &&
    !responsibilities.includes("security_manager") &&
    Boolean(project.pentesterTableStatus);
  if (usePentesterLifecycle) return project.pentesterTableStatus!;
  return normalizeStatus(project.status);
}

function normalizeProject(project: ApiProjectResponse): Project {
  const testExpiresAt = project.testExpiresAt || project.expireDay || project.expireDayQuality;
  const projectManagerId = project.projectManager ? String(project.projectManager) : undefined;
  const devopsInfo = {
    environment: project.devopsInfo?.environment || project.environment,
    repository: project.devopsInfo?.repository || project.repository,
    pipeline: project.devopsInfo?.pipeline || project.pipeline,
    deploymentUrl: project.devopsInfo?.deploymentUrl,
    serverInventory: project.devopsInfo?.serverInventory,
    releaseBranch: project.devopsInfo?.releaseBranch,
    notes: project.devopsInfo?.notes,
  };

  return {
    id: project.id || project._id || "",
    name: project.projectName,
    client: "-",
    projectGroupId: project.projectGroupId,
    canonicalName: project.canonicalName,
    createdByUserId: project.ownerId ? String(project.ownerId) : undefined,
    securityManagerId: project.type === "security" ? projectManagerId : undefined,
    qualityManagerId: project.qualityManager
      ? String(project.qualityManager)
      : project.type === "quality"
        ? projectManagerId
        : undefined,
    devopsAssigneeId: project.devops ? String(project.devops) : undefined,
    representativeId: project.representative ? String(project.representative) : undefined,
    assignedUserIds: Array.isArray(project.assignedUserIds)
      ? project.assignedUserIds.map(String)
      : [],
    version: project.version,
    letterNumber: project.letterNumber,
    platform: getPlatform(project.platform),
    createdAt: project.createdAt,
    testExpiresAt,
    deadlineEnabled: project.deadlineEnabled !== false,
    deadlinePassed: project.deadlinePassed,
    closureReason: project.closureReason,
    discipline: project.type === "quality" ? "quality" : project.type === "devops" ? "devops" : "security",
    status: normalizeVisibleStatus(project),
    workStatus: project.assignmentStatus,
    totalWorkTime: project.totalWorkTime,
    workTimerStartedAt: project.workTimerStartedAt,
    priority: "medium",
    owner: project.projectManager ? String(project.projectManager) : "-",
    assignee: project.devops ? String(project.devops) : "-",
    dueDate: testExpiresAt || project.createdAt || new Date().toISOString(),
    progress: project.progress ?? 0,
    riskScore: 0,
    vulnerabilities: project.vulnerabilities ?? 0,
    testCoverage: 0,
    openBugs: 0,
    environment: devopsInfo.environment || "-",
    repository: devopsInfo.repository || "-",
    pipeline: devopsInfo.pipeline || "-",
    devopsInfo,
    lastActivity: project.updatedAt || project.createdAt || new Date().toISOString(),
    allowedActions: project.allowedActions,
    responsibilityContext: project.responsibilityContext,
    myResponsibilities:
      project.responsibilityContext?.responsibilityKeys || project.myResponsibilities,
    provisioningStatus: project.provisioningStatus || "DEVOPS_READY",
    provisioningAttemptNumber: project.provisioningAttemptNumber || 1,
    provisioningHistory: project.provisioningHistory,
    devopsConfirmedBy: project.devopsConfirmedBy,
    devopsConfirmedAt: project.devopsConfirmedAt,
    devopsNotes: project.devopsNotes,
    devopsFailureReason: project.devopsFailureReason,
    devopsFailureDescription: project.devopsFailureDescription,
    devopsRecommendedAction: project.devopsRecommendedAction,
    devopsFailureEvidence: project.devopsFailureEvidence,
    devopsFailureAt: project.devopsFailureAt,
    provisioningBlockedDurationMs: project.provisioningBlockedDurationMs,
    devopsResolutionMessage: project.devopsResolutionMessage,
    devopsResolutionSubmittedAt: project.devopsResolutionSubmittedAt,
    devopsResolutionSubmittedBy: project.devopsResolutionSubmittedBy,
  };
}

function normalizeProjectsResponse(response: ProjectListResponse): Project[] {
  const projects = Array.isArray(response)
    ? response
    : response.projects || response.data || [];

  return projects.map(normalizeProject);
}

function normalizeProjectDetailResponse(response: ProjectDetailResponse): Project {
  if ("project" in response && response.project) return normalizeProject(response.project);
  if ("data" in response && response.data) return normalizeProject(response.data);
  return normalizeProject(response as ApiProjectResponse);
}

export const projectsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getProjects: builder.query<
      Project[],
      ProjectListView | { view?: ProjectListView; columns?: string[] }
    >({
      query: (request) => {
        const view = typeof request === "string" ? request : request.view;
        const columns = typeof request === "string" ? undefined : request.columns;
        return { url: "/projects", params: { view, ...(columns?.length ? { columns: columns.join(",") } : {}) } };
      },
      transformResponse: normalizeProjectsResponse,
      providesTags: ["Projects"],
    }),
    getProject: builder.query<Project, string>({
      query: (projectId) => ({ url: `/projects/${projectId}` }),
      transformResponse: normalizeProjectDetailResponse,
      providesTags: (_result, _error, projectId) => [
        "Projects",
        { type: "Projects", id: projectId },
      ],
    }),
    closeProject: builder.mutation<Project, string>({
      query: (projectId) => ({
        url: `/projects/${projectId}/status`,
        method: "PUT",
        body: { status: "closed" },
      }),
      transformResponse: normalizeProjectDetailResponse,
      invalidatesTags: (_result, _error, projectId) => [
        "Projects",
        { type: "Projects", id: projectId },
      ],
    }),
    updateProjectDeadlineSettings: builder.mutation<
      Project,
      { projectId: string; deadlineEnabled: boolean }
    >({
      query: ({ projectId, deadlineEnabled }) => ({
        url: `/projects/${projectId}/deadline-settings`,
        method: "PUT",
        body: { deadlineEnabled },
      }),
      transformResponse: normalizeProjectDetailResponse,
      invalidatesTags: (_result, _error, { projectId }) => [
        "Projects",
        { type: "Projects", id: projectId },
      ],
    }),
    getDeadlineExtensionRequests: builder.query<DeadlineExtensionRequest[], string>({
      query: (projectId) => `/projects/${projectId}/deadline-extension-requests`,
      transformResponse: (response) => unwrapApiData<DeadlineExtensionRequest[]>(response),
      providesTags: (_result, _error, projectId) => [
        { type: "Projects", id: `deadline-requests-${projectId}` },
      ],
    }),
    createDeadlineExtensionRequest: builder.mutation<
      DeadlineExtensionRequest,
      {
        projectId: string;
        requestType: "individual" | "project";
        requestedDeadline: string;
        message?: string;
      }
    >({
      query: ({ projectId, requestType, requestedDeadline, message }) => ({
        url: `/projects/${projectId}/deadline-extension-requests`,
        method: "POST",
        body: {
          requestType,
          requestedDeadline,
          ...(message ? { message } : {}),
        },
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "Projects", id: `deadline-requests-${projectId}` },
      ],
    }),
    reviewDeadlineExtensionRequest: builder.mutation<
      DeadlineExtensionRequest,
      {
        projectId: string;
        requestId: string;
        action: "approve" | "reject" | "forward";
        reviewNote?: string;
      }
    >({
      query: ({ projectId, requestId, action, reviewNote }) => ({
        url: `/projects/${projectId}/deadline-extension-requests/${requestId}`,
        method: "PUT",
        body: { action, ...(reviewNote ? { reviewNote } : {}) },
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        "Projects",
        { type: "Projects", id: projectId },
        { type: "Projects", id: `deadline-requests-${projectId}` },
      ],
    }),
    getProjectBugVisibilitySettings: builder.query<ProjectBugVisibilitySettings, string>({
      query: (projectId) => `/projects/${projectId}/bug-visibility-settings`,
      transformResponse: (response) =>
        unwrapApiData<ProjectBugVisibilitySettings>(response),
      providesTags: (_result, _error, projectId) => [
        { type: "Projects", id: `bug-visibility-${projectId}` },
      ],
    }),
    updateProjectBugVisibilitySettings: builder.mutation<
      ProjectBugVisibilitySettings,
      { projectId: string; settings: Omit<ProjectBugVisibilitySettings, "eligiblePentesters"> }
    >({
      query: ({ projectId, settings }) => ({
        url: `/projects/${projectId}/bug-visibility-settings`,
        method: "PUT",
        body: settings,
      }),
      transformResponse: (response) =>
        unwrapApiData<ProjectBugVisibilitySettings>(response),
      invalidatesTags: (_result, _error, { projectId }) => [
        "Projects",
        { type: "Projects", id: `bug-visibility-${projectId}` },
      ],
    }),
    getProjectAssignees: builder.query<User[], { projectId: string; role: "pentester" | "qa" }>({
      query: ({ projectId, role }) => ({
        url: `/projects/${projectId}/eligible-assignees`,
        params: { role },
      }),
      transformResponse: normalizeUsersResponse,
      providesTags: ["Users"],
    }),
    getProjectSecurityStandards: builder.query<ProjectSecurityStandardsContract, string>({
      query: (projectId) => `/projects/${projectId}/security-standards`,
      transformResponse: (response) =>
        unwrapApiData<ProjectSecurityStandardsContract>(response),
    }),
    getSecurityStandardTree: builder.query<
      SecurityStandardTreeContract,
      { standardKey: string; version: string }
    >({
      query: ({ standardKey, version }) =>
        `/security-standards/${encodeURIComponent(standardKey)}/${encodeURIComponent(version)}`,
      transformResponse: (response) => unwrapApiData<SecurityStandardTreeContract>(response),
    }),
    getProjectSecurityScope: builder.query<ProjectSecurityScopeContract, string>({
      query: (projectId) => `/projects/${projectId}/security-scope`,
      transformResponse: (response) => unwrapApiData<ProjectSecurityScopeContract>(response),
    }),
    getProjectPentesterScopes: builder.query<ProjectPentesterScopesContract, string>({
      query: (projectId) => `/projects/${projectId}/pentester-scopes`,
      transformResponse: (response) =>
        unwrapApiData<ProjectPentesterScopesContract>(response),
      providesTags: ["Projects"],
    }),
    assignProjectUsers: builder.mutation<
      {
        project?: unknown;
        assignedUserIds: string[];
        addedUserIds?: string[];
        removedUserIds?: string[];
      },
      {
        projectId: string;
        userIds: string[];
        role?: "pentester" | "qa";
        pentesterScopes?: PentesterScopeAssignmentContract[];
      }
    >({
      query: ({ projectId, userIds, role = "pentester", pentesterScopes }) => ({
        url: `/projects/${projectId}/assign-users`,
        method: "POST",
        body: { userIds, role, ...(pentesterScopes ? { pentesterScopes } : {}) },
      }),
      invalidatesTags: ["Projects", "Users", "Notifications"],
    }),
    createProject: builder.mutation<CreateProjectResponse, CreateProjectRequest>({
      query: (body) => ({ url: "/projects", method: "POST", body }),
      transformResponse: normalizeProjectResponse,
      invalidatesTags: ["Projects"],
    }),
  }),
});

export const {
  useAssignProjectUsersMutation,
  useCreateProjectMutation,
  useCloseProjectMutation,
  useUpdateProjectDeadlineSettingsMutation,
  useGetDeadlineExtensionRequestsQuery,
  useCreateDeadlineExtensionRequestMutation,
  useReviewDeadlineExtensionRequestMutation,
  useGetProjectQuery,
  useGetProjectBugVisibilitySettingsQuery,
  useUpdateProjectBugVisibilitySettingsMutation,
  useGetProjectAssigneesQuery,
  useGetProjectPentesterScopesQuery,
  useGetProjectSecurityScopeQuery,
  useGetProjectSecurityStandardsQuery,
  useGetProjectsQuery,
  useGetSecurityStandardTreeQuery,
} = projectsApi;
