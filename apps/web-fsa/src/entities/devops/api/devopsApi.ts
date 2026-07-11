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
export type DevopsWorkspace = { projectId: string; assignedUsers: AssignedUser[]; info: DevopsInfo | null };

export const devopsApi = api.injectEndpoints({ endpoints: (builder) => ({
  getDevopsWorkspace: builder.query<DevopsWorkspace, string>({
    query: (projectId) => `/devops/projects/${projectId}`,
    transformResponse: (response) => unwrapApiData<DevopsWorkspace>(response),
    providesTags: (_r, _e, id) => [{ type: "DevOps", id }],
  }),
  saveDevopsWorkspace: builder.mutation<DevopsWorkspace, { projectId: string; info: DevopsInfo }>({
    query: ({ projectId, info }) => ({ url: `/devops/projects/${projectId}`, method: "PUT", body: info }),
    transformResponse: (response) => unwrapApiData<DevopsWorkspace>(response),
    invalidatesTags: (_r, _e, { projectId }) => [{ type: "DevOps", id: projectId }],
  }),
}) });
export const { useGetDevopsWorkspaceQuery, useSaveDevopsWorkspaceMutation } = devopsApi;
