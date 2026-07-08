import { api } from "@/shared/api/baseApi";
import { unwrapApiData } from "@/shared/api/unwrapApiData";

export const deliveryModes = [
  "ovf",
  "docker",
  "external_url",
  "mobile_files",
  "none",
  "other",
] as const;
export const provisioningStatuses = [
  "not_started",
  "preparing",
  "partially_ready",
  "ready",
  "blocked",
  "failed",
  "retired",
] as const;
export const artifactTypes = [
  "ovf",
  "docker_image",
  "docker_compose",
  "apk",
  "ipa",
  "file",
  "download_url",
  "none",
  "other",
] as const;
export const runtimeInstanceTypes = ["vm", "container", "shared", "external"] as const;
export const runtimeInstanceStatuses = [
  "pending",
  "provisioning",
  "ready",
  "failed",
  "retired",
] as const;
export const testTargetTypes = [
  "web",
  "api",
  "admin",
  "desktop",
  "mobile",
  "endpoint",
  "other",
] as const;
export const credentialGroupTypes = ["instance_access", "application_accounts"] as const;
export const credentialScopes = [
  "shared_for_all_users",
  "per_user",
  "per_instance",
  "per_target",
] as const;

export type DevOpsCredentialAccount = {
  label: string;
  role: string;
  username: string;
  password: string;
  token: string;
  notes: string;
};
export type DevOpsCredentialGroupInput = {
  name: string;
  type: (typeof credentialGroupTypes)[number];
  scope: (typeof credentialScopes)[number];
  targetIds: string[];
  instanceIds: string[];
  visibleToUserIds: string[];
  accounts: DevOpsCredentialAccount[];
};
export type DevOpsCredentialGroup = DevOpsCredentialGroupInput & {
  _id: string;
  projectId: string;
  devOpsInfoId: string;
  createdAt: string;
  updatedAt: string;
};

export type MobileArtifactInput = {
  artifactType: "apk" | "ipa" | "file" | "download_url";
  name: string;
  version: string;
  platform: "android" | "ios" | "both" | "other";
  fileRef: string;
  downloadUrl: string;
  checksum: string;
  buildNumber: string;
  packageName: string;
  bundleId: string;
  minOsVersion: string;
  deviceNotes: string;
  installNotes: string;
};
export type MobileArtifact = MobileArtifactInput & {
  _id: string;
  projectId: string;
  devOpsInfoId: string;
  setupType: "mobile_app";
  createdAt: string;
  updatedAt: string;
};

export type RuntimeInstanceInput = {
  assignedUserId?: string | null;
  name: string;
  type: (typeof runtimeInstanceTypes)[number];
  status: (typeof runtimeInstanceStatuses)[number];
  accessUrl: string;
  consoleUrl: string;
  host: string;
  port?: number | null;
  networkNotes: string;
  notes: string;
};
export type RuntimeInstance = RuntimeInstanceInput & {
  _id: string;
  projectId: string;
  devOpsInfoId: string;
  createdAt: string;
  updatedAt: string;
};

export type TestTargetInput = {
  runtimeInstanceId?: string | null;
  name: string;
  type: (typeof testTargetTypes)[number];
  url: string;
  version: string;
  authRequired: boolean;
  notes: string;
};
export type TestTarget = TestTargetInput & {
  _id: string;
  projectId: string;
  devOpsInfoId: string;
  createdAt: string;
  updatedAt: string;
};

export type ProjectDevOpsInfoInput = {
  linkedDevOpsProjectId?: string | null;
  deliveryMode: (typeof deliveryModes)[number];
  provisioningStatus: (typeof provisioningStatuses)[number];
  sourceArtifact: {
    type: (typeof artifactTypes)[number];
    name: string;
    version: string;
    location: string;
    checksum: string;
    notes: string;
  };
  environment: {
    environmentName: string;
    accessUrl: string;
    repositoryUrl: string;
    branch: string;
    pipelineUrl: string;
    networkNotes: string;
  };
  notes: string;
  blockers: string;
};

export type ProjectDevOpsInfo = ProjectDevOpsInfoInput & {
  exists: boolean;
  completionStatus: "empty" | "partial" | "complete";
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  version: number;
};

export const emptyProjectDevOpsInfo: ProjectDevOpsInfoInput = {
  linkedDevOpsProjectId: null,
  deliveryMode: "none",
  provisioningStatus: "not_started",
  sourceArtifact: {
    type: "none",
    name: "",
    version: "",
    location: "",
    checksum: "",
    notes: "",
  },
  environment: {
    environmentName: "",
    accessUrl: "",
    repositoryUrl: "",
    branch: "",
    pipelineUrl: "",
    networkNotes: "",
  },
  notes: "",
  blockers: "",
};

export const devOpsInfoApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getProjectDevOpsInfo: builder.query<ProjectDevOpsInfo, string>({
      query: (projectId) => `/projects/${projectId}/devops-info`,
      transformResponse: (response) => unwrapApiData<ProjectDevOpsInfo>(response),
      providesTags: (_result, _error, projectId) => [{ type: "Projects", id: `devops-${projectId}` }],
    }),
    updateProjectDevOpsInfo: builder.mutation<
      ProjectDevOpsInfo,
      { projectId: string; body: ProjectDevOpsInfoInput }
    >({
      query: ({ projectId, body }) => ({
        url: `/projects/${projectId}/devops-info`,
        method: "PUT",
        body,
      }),
      transformResponse: (response) => unwrapApiData<ProjectDevOpsInfo>(response),
      invalidatesTags: (_result, _error, { projectId }) => [
        "Projects",
        { type: "Projects", id: `devops-${projectId}` },
      ],
    }),
    getRuntimeInstances: builder.query<RuntimeInstance[], string>({
      query: (projectId) => `/projects/${projectId}/devops-info/instances`,
      transformResponse: (response) => unwrapApiData<RuntimeInstance[]>(response),
      providesTags: (_result, _error, projectId) => [
        { type: "Projects", id: `devops-instances-${projectId}` },
      ],
    }),
    createRuntimeInstance: builder.mutation<
      RuntimeInstance,
      { projectId: string; body: RuntimeInstanceInput }
    >({
      query: ({ projectId, body }) => ({
        url: `/projects/${projectId}/devops-info/instances`, method: "POST", body,
      }),
      transformResponse: (response) => unwrapApiData<RuntimeInstance>(response),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "Projects", id: `devops-instances-${projectId}` },
        { type: "Projects", id: `devops-${projectId}` },
      ],
    }),
    updateRuntimeInstance: builder.mutation<
      RuntimeInstance,
      { projectId: string; instanceId: string; body: Partial<RuntimeInstanceInput> }
    >({
      query: ({ projectId, instanceId, body }) => ({
        url: `/projects/${projectId}/devops-info/instances/${instanceId}`,
        method: "PATCH", body,
      }),
      transformResponse: (response) => unwrapApiData<RuntimeInstance>(response),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "Projects", id: `devops-instances-${projectId}` },
        { type: "Projects", id: `devops-${projectId}` },
      ],
    }),
    deleteRuntimeInstance: builder.mutation<{ id: string }, { projectId: string; instanceId: string }>({
      query: ({ projectId, instanceId }) => ({
        url: `/projects/${projectId}/devops-info/instances/${instanceId}`, method: "DELETE",
      }),
      transformResponse: (response) => unwrapApiData<{ id: string }>(response),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "Projects", id: `devops-instances-${projectId}` },
        { type: "Projects", id: `devops-${projectId}` },
      ],
    }),
    getTestTargets: builder.query<TestTarget[], string>({
      query: (projectId) => `/projects/${projectId}/devops-info/targets`,
      transformResponse: (response) => unwrapApiData<TestTarget[]>(response),
      providesTags: (_result, _error, projectId) => [
        { type: "Projects", id: `devops-targets-${projectId}` },
      ],
    }),
    createTestTarget: builder.mutation<TestTarget, { projectId: string; body: TestTargetInput }>({
      query: ({ projectId, body }) => ({
        url: `/projects/${projectId}/devops-info/targets`, method: "POST", body,
      }),
      transformResponse: (response) => unwrapApiData<TestTarget>(response),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "Projects", id: `devops-targets-${projectId}` },
        { type: "Projects", id: `devops-${projectId}` },
      ],
    }),
    updateTestTarget: builder.mutation<
      TestTarget,
      { projectId: string; targetId: string; body: Partial<TestTargetInput> }
    >({
      query: ({ projectId, targetId, body }) => ({
        url: `/projects/${projectId}/devops-info/targets/${targetId}`,
        method: "PATCH", body,
      }),
      transformResponse: (response) => unwrapApiData<TestTarget>(response),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "Projects", id: `devops-targets-${projectId}` },
        { type: "Projects", id: `devops-${projectId}` },
      ],
    }),
    deleteTestTarget: builder.mutation<{ id: string }, { projectId: string; targetId: string }>({
      query: ({ projectId, targetId }) => ({
        url: `/projects/${projectId}/devops-info/targets/${targetId}`, method: "DELETE",
      }),
      transformResponse: (response) => unwrapApiData<{ id: string }>(response),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "Projects", id: `devops-targets-${projectId}` },
        { type: "Projects", id: `devops-${projectId}` },
      ],
    }),
    getCredentialGroups: builder.query<DevOpsCredentialGroup[], string>({
      query: (projectId) => `/projects/${projectId}/devops-info/credential-groups`,
      transformResponse: (response) => unwrapApiData<DevOpsCredentialGroup[]>(response),
      providesTags: (_result, _error, projectId) => [
        { type: "Projects", id: `devops-credentials-${projectId}` },
      ],
    }),
    createCredentialGroup: builder.mutation<
      DevOpsCredentialGroup,
      { projectId: string; body: DevOpsCredentialGroupInput }
    >({
      query: ({ projectId, body }) => ({
        url: `/projects/${projectId}/devops-info/credential-groups`, method: "POST", body,
      }),
      transformResponse: (response) => unwrapApiData<DevOpsCredentialGroup>(response),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "Projects", id: `devops-credentials-${projectId}` },
      ],
    }),
    updateCredentialGroup: builder.mutation<
      DevOpsCredentialGroup,
      { projectId: string; groupId: string; body: Partial<DevOpsCredentialGroupInput> }
    >({
      query: ({ projectId, groupId, body }) => ({
        url: `/projects/${projectId}/devops-info/credential-groups/${groupId}`, method: "PATCH", body,
      }),
      transformResponse: (response) => unwrapApiData<DevOpsCredentialGroup>(response),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "Projects", id: `devops-credentials-${projectId}` },
      ],
    }),
    deleteCredentialGroup: builder.mutation<{ id: string }, { projectId: string; groupId: string }>({
      query: ({ projectId, groupId }) => ({
        url: `/projects/${projectId}/devops-info/credential-groups/${groupId}`, method: "DELETE",
      }),
      transformResponse: (response) => unwrapApiData<{ id: string }>(response),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "Projects", id: `devops-credentials-${projectId}` },
      ],
    }),
    getMobileArtifacts: builder.query<MobileArtifact[], string>({
      query: (projectId) => `/projects/${projectId}/devops-info/artifacts`,
      transformResponse: (response) => unwrapApiData<MobileArtifact[]>(response),
      providesTags: (_result, _error, projectId) => [
        { type: "Projects", id: `devops-artifacts-${projectId}` },
      ],
    }),
    createMobileArtifact: builder.mutation<MobileArtifact, { projectId: string; body: MobileArtifactInput }>({
      query: ({ projectId, body }) => ({ url: `/projects/${projectId}/devops-info/artifacts`, method: "POST", body }),
      transformResponse: (response) => unwrapApiData<MobileArtifact>(response),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "Projects", id: `devops-artifacts-${projectId}` },
        { type: "Projects", id: `devops-${projectId}` },
      ],
    }),
    updateMobileArtifact: builder.mutation<MobileArtifact, { projectId: string; artifactId: string; body: Partial<MobileArtifactInput> }>({
      query: ({ projectId, artifactId, body }) => ({ url: `/projects/${projectId}/devops-info/artifacts/${artifactId}`, method: "PATCH", body }),
      transformResponse: (response) => unwrapApiData<MobileArtifact>(response),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "Projects", id: `devops-artifacts-${projectId}` },
        { type: "Projects", id: `devops-${projectId}` },
      ],
    }),
    deleteMobileArtifact: builder.mutation<{ id: string }, { projectId: string; artifactId: string }>({
      query: ({ projectId, artifactId }) => ({ url: `/projects/${projectId}/devops-info/artifacts/${artifactId}`, method: "DELETE" }),
      transformResponse: (response) => unwrapApiData<{ id: string }>(response),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "Projects", id: `devops-artifacts-${projectId}` },
        { type: "Projects", id: `devops-${projectId}` },
      ],
    }),
  }),
});

export const {
  useGetProjectDevOpsInfoQuery,
  useUpdateProjectDevOpsInfoMutation,
  useGetRuntimeInstancesQuery,
  useCreateRuntimeInstanceMutation,
  useUpdateRuntimeInstanceMutation,
  useDeleteRuntimeInstanceMutation,
  useGetTestTargetsQuery,
  useCreateTestTargetMutation,
  useUpdateTestTargetMutation,
  useDeleteTestTargetMutation,
  useGetCredentialGroupsQuery,
  useCreateCredentialGroupMutation,
  useUpdateCredentialGroupMutation,
  useDeleteCredentialGroupMutation,
  useGetMobileArtifactsQuery,
  useCreateMobileArtifactMutation,
  useUpdateMobileArtifactMutation,
  useDeleteMobileArtifactMutation,
} = devOpsInfoApi;
