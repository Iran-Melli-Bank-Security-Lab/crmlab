import { api } from "@/shared/api/baseApi";
import type { AuthResponse, Permission, Role, User } from "@/shared/types";

type LoginPayload = { username: string; password: string };
type RegisterPayload = {
  firstName: string;
  lastName: string;
  username: string;
  password: string;
  avatarUrl?: string;
  avatarFileId?: string;
};

type BackendUser = Partial<User> & {
  firstName?: string;
  lastName?: string;
  username?: string;
  sessionVersion?: number;
  projectIds?: string[];
  roles?: Role[];
  permissions?: Permission[];
};

type BackendAuthResponse = {
  success?: boolean;
  data?: BackendUser | { user?: BackendUser; csrfToken?: string };
  user?: BackendUser;
  csrfToken?: string;
};

function isBackendUser(value: unknown): value is BackendUser {
  if (!value || typeof value !== "object") return false;
  const candidate = value as BackendUser;
  return Boolean(
    candidate.id ||
    candidate.name ||
    candidate.username ||
    Array.isArray(candidate.roles) ||
    Array.isArray(candidate.permissions)
  );
}

function getUserFromAuthResponse(response: BackendAuthResponse): BackendUser | undefined {
  const data = response.data;

  if (response.user) return response.user;
  if (isBackendUser(data)) return data;
  if (data && "user" in data && data.user) return data.user;

  return undefined;
}

function getCsrfTokenFromAuthResponse(response: BackendAuthResponse) {
  const data = response.data;

  if (data && "csrfToken" in data && data.csrfToken) return data.csrfToken;
  return response.csrfToken;
}

const normalizeAuthUser = (user: BackendUser): User => {
  const displayName =
    user.name ||
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.username ||
    "";
  const roles = Array.isArray(user.roles) ? user.roles : [];
  const permissions = Array.isArray(user.permissions) ? user.permissions : [];

  return {
    ...user,
    id: user.id || "",
    name: displayName,
    roles,
    permissions,
  };
};

const normalizeMeResponse = (response: BackendUser | BackendAuthResponse): User => {
  const authResponse = response as BackendAuthResponse;
  const user = getUserFromAuthResponse(authResponse);

  if (
    authResponse.data ||
    authResponse.user ||
    "success" in response ||
    "csrfToken" in response
  ) {
    if (!user) {
      throw new Error("Auth response did not include a user");
    }
    return normalizeAuthUser(user);
  }

  return normalizeAuthUser(response as BackendUser);
};

const normalizeAuthResponse = (response: BackendAuthResponse): AuthResponse => {
  const user = getUserFromAuthResponse(response);

  if (!user) {
    throw new Error("Auth response did not include a user");
  }

  return {
    user: normalizeAuthUser(user),
    csrfToken: getCsrfTokenFromAuthResponse(response),
  };
};

export const authApi = api.injectEndpoints({
  endpoints: (builder) => ({
    loginUser: builder.mutation<AuthResponse, LoginPayload>({
      query: (loginData) => ({ url: "/auth/login", method: "POST", body: loginData }),
      transformResponse: normalizeAuthResponse,
      invalidatesTags: ["Auth"],
    }),
    registerUser: builder.mutation<AuthResponse, RegisterPayload>({
      query: (registerData) => ({
        url: "/auth/register",
        method: "POST",
        body: registerData,
      }),
      transformResponse: normalizeAuthResponse,
      invalidatesTags: ["Auth", "Users"],
    }),
    getMe: builder.query<AuthResponse["user"], void>({
      query: () => "/auth/me",
      transformResponse: normalizeMeResponse,
      providesTags: ["Auth"],
    }),
    logoutUser: builder.mutation<{ success: boolean }, void>({
      query: () => ({ url: "/auth/logout", method: "POST" }),
      invalidatesTags: ["Auth"],
    }),
  }),
});

export const {
  useLoginUserMutation,
  useRegisterUserMutation,
  useGetMeQuery,
  useLogoutUserMutation,
} = authApi;
