import { api } from "@/shared/api/baseApi";
import { unwrapApiData } from "@/shared/api/unwrapApiData";

export type SecretEdit = { value: string } | { unchanged: true };
export type AuthenticationAccount = { id: string; authenticationMethod: "username_password" | "username_password_otp"; username: string; password: SecretEdit; otp?: { type: string; secret: SecretEdit; deliveryMethod?: string; instructions?: string } };
export type ApplicationEndpoint = { id: string; url?: string; ipAddress?: string; port?: number; description?: string; authenticationAccounts: AuthenticationAccount[] };
export type AssignedUser = { assignmentId: string; userId: string; fullName: string; username: string; role: string };
export type DevopsInfo = {
  deploymentMode: "shared_vm" | "separate_vm_per_user";
  sharedVm?: { endpoints: ApplicationEndpoint[] };
  separateVm?: { serverIpAddress: string; serverPort: number; vmUsername: string; vmPassword: SecretEdit; users: Array<{ assignmentId: string; userId: string; serverUsername: string; serverPassword: SecretEdit; vmIpAddress: string; vmPort: number; endpoints: ApplicationEndpoint[] }> };
};
export type DevopsAccessAccount = {
  authenticationMethod: "username_password" | "username_password_otp";
  username: string;
  password: string;
  otp?: { type?: string; deliveryMethod?: string; instructions?: string };
};
export type DevopsAccessEndpoint = Omit<ApplicationEndpoint, "authenticationAccounts"> & {
  authenticationAccounts: DevopsAccessAccount[];
};
export type DevopsAccess =
  | { mode: "shared"; assignmentState: "available"; endpoints: DevopsAccessEndpoint[]; updatedAt?: string }
  | { mode: "personal"; assignmentState: "unassigned"; endpoints: []; updatedAt?: string }
  | { mode: "personal"; assignmentState: "available"; serverIpAddress?: string; serverPort?: number; vmIpAddress: string; vmPort: number; username: string; password: string; endpoints: DevopsAccessEndpoint[]; updatedAt?: string };
export type DevopsWorkspace = { projectId: string; assignedUsers: AssignedUser[]; info: DevopsInfo | null; access: DevopsAccess | null };
export type DevopsWorkspaceQuery = { projectId: string; userId: string };
export type ProvisioningTransitionResponse = {
  id: string;
  provisioningStatus: "AWAITING_DEVOPS_SETUP" | "DEVOPS_IN_PROGRESS" | "DEVOPS_READY" | "DEVOPS_BLOCKED";
};

export const devopsApi = api.injectEndpoints({ endpoints: (builder) => ({
  getDevopsWorkspace: builder.query<DevopsWorkspace, DevopsWorkspaceQuery>({
    // userId is intentionally not sent to the server. It only isolates credential-bearing cache entries.
    query: ({ projectId }) => `/devops/projects/${projectId}`,
    transformResponse: (response) => unwrapApiData<DevopsWorkspace>(response),
    keepUnusedDataFor: 0,
    providesTags: (_r, _e, { projectId, userId }) => [
      { type: "DevOps", id: projectId },
      { type: "DevOps", id: `${projectId}:${userId}` },
    ],
  }),
  saveDevopsWorkspace: builder.mutation<DevopsWorkspace, { projectId: string; info: DevopsInfo }>({
    query: ({ projectId, info }) => ({ url: `/devops/projects/${projectId}`, method: "PUT", body: info }),
    transformResponse: (response) => unwrapApiData<DevopsWorkspace>(response),
    invalidatesTags: (_r, _e, { projectId }) => [{ type: "DevOps", id: projectId }],
  }),
  startProvisioning: builder.mutation<
    ProvisioningTransitionResponse,
    { projectId: string; notes?: string }
  >({
    query: ({ projectId, notes }) => ({
      url: `/projects/${projectId}/provisioning/start`,
      method: "POST",
      body: { notes },
    }),
    transformResponse: (response) => unwrapApiData<ProvisioningTransitionResponse>(response),
    invalidatesTags: ["Projects", "Notifications"],
  }),
  confirmProvisioningReady: builder.mutation<
    ProvisioningTransitionResponse,
    { projectId: string; notes?: string }
  >({
    query: ({ projectId, notes }) => ({
      url: `/projects/${projectId}/provisioning/ready`,
      method: "POST",
      body: { notes },
    }),
    transformResponse: (response) => unwrapApiData<ProvisioningTransitionResponse>(response),
    invalidatesTags: ["Projects", "Notifications"],
  }),
  reportProvisioningBlocked: builder.mutation<
    ProvisioningTransitionResponse,
    {
      projectId: string;
      failureReason: string;
      technicalDescription: string;
      recommendedAction?: string;
    }
  >({
    query: ({ projectId, ...body }) => ({
      url: `/projects/${projectId}/provisioning/blocked`,
      method: "POST",
      body,
    }),
    transformResponse: (response) => unwrapApiData<ProvisioningTransitionResponse>(response),
    invalidatesTags: ["Projects", "Notifications"],
  }),
  requestProvisioningRetry: builder.mutation<
    ProvisioningTransitionResponse,
    { projectId: string; notes?: string }
  >({
    query: ({ projectId, notes }) => ({
      url: `/projects/${projectId}/provisioning/retry`,
      method: "POST",
      body: { notes },
    }),
    transformResponse: (response) => unwrapApiData<ProvisioningTransitionResponse>(response),
    invalidatesTags: ["Projects", "Notifications"],
  }),
}) });
export const {
  useConfirmProvisioningReadyMutation,
  useGetDevopsWorkspaceQuery,
  useReportProvisioningBlockedMutation,
  useRequestProvisioningRetryMutation,
  useSaveDevopsWorkspaceMutation,
  useStartProvisioningMutation,
} = devopsApi;
