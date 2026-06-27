import { api } from "@/shared/api/baseApi";
import type { Project, User } from "@/shared/types";
import type {
  ApiProjectResponse,
  CreateProjectRequest,
  CreateProjectResponse,
  ProjectListView,
} from "@/shared/types/api/projects";

type ProjectResponse =
  | CreateProjectResponse
  | { data?: CreateProjectResponse; project?: CreateProjectResponse };
type ProjectListResponse =
  | ApiProjectResponse[]
  | { data?: ApiProjectResponse[]; projects?: ApiProjectResponse[] };
type UsersResponse = User[] | { users?: User[]; items?: User[]; data?: User[] };

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
    discipline: project.type === "quality" ? "quality" : project.type === "devops" ? "devops" : "security",
    status: normalizeStatus(project.status),
    priority: "medium",
    owner: project.projectManager ? String(project.projectManager) : "-",
    assignee: project.devops ? String(project.devops) : "-",
    dueDate: testExpiresAt || project.createdAt || new Date().toISOString(),
    progress: 0,
    riskScore: 0,
    vulnerabilities: 0,
    testCoverage: 0,
    openBugs: 0,
    environment: devopsInfo.environment || "-",
    repository: devopsInfo.repository || "-",
    pipeline: devopsInfo.pipeline || "-",
    devopsInfo,
    lastActivity: project.updatedAt || project.createdAt || new Date().toISOString(),
  };
}

function normalizeProjectsResponse(response: ProjectListResponse): Project[] {
  const projects = Array.isArray(response)
    ? response
    : response.projects || response.data || [];

  return projects.map(normalizeProject);
}

export const projectsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getProjects: builder.query<Project[], ProjectListView>({
      query: (view) => ({ url: "/projects", params: { view } }),
      transformResponse: normalizeProjectsResponse,
      providesTags: ["Projects"],
    }),
    getProjectAssignees: builder.query<User[], { projectId: string; role: "pentester" }>({
      query: ({ projectId, role }) => ({
        url: `/projects/${projectId}/eligible-assignees`,
        params: { role },
      }),
      transformResponse: normalizeUsersResponse,
      providesTags: ["Users"],
    }),
    assignProjectUsers: builder.mutation<
      {
        project?: unknown;
        assignedUserIds: string[];
        addedUserIds?: string[];
        removedUserIds?: string[];
      },
      { projectId: string; userIds: string[]; role?: "pentester" }
    >({
      query: ({ projectId, userIds, role = "pentester" }) => ({
        url: `/projects/${projectId}/assign-users`,
        method: "POST",
        body: { userIds, role },
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
  useGetProjectAssigneesQuery,
  useGetProjectsQuery,
} = projectsApi;
