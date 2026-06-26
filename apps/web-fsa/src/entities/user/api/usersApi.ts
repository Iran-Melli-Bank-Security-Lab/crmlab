import { api } from "@/shared/api/baseApi";
import { unwrapApiData } from "@/shared/api/unwrapApiData";
import type { RolesAndPermissions, User, UserFormPayload } from "@/shared/types";

type UsersPayload = User[] | { users?: User[]; items?: User[] };
type UsersResponse = UsersPayload | { success?: boolean; data?: UsersPayload };
type UserPayload = User | { user?: User };
type UserResponse = UserPayload | { success?: boolean; data?: UserPayload };
type RolesAndPermissionsResponse = RolesAndPermissions | { success?: boolean; data?: RolesAndPermissions };

function normalizeUsersResponse(response: UsersResponse): User[] {
  const payload = unwrapApiData<UsersPayload>(response);
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.users)) return payload.users;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function normalizeRolesAndPermissionsResponse(
  response: RolesAndPermissionsResponse
): RolesAndPermissions {
  return unwrapApiData<RolesAndPermissions>(response);
}

function normalizeUserResponse(response: UserResponse): User {
  const payload = unwrapApiData<UserPayload>(response);
  if ("user" in payload && payload.user) return payload.user;
  return payload as User;
}

export const usersApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getUsers: builder.query<User[], void>({
      query: () => "/users",
      transformResponse: normalizeUsersResponse,
      providesTags: ["Users"],
    }),
    getUserById: builder.query<User, string>({
      query: (id) => `/users/${id}`,
      transformResponse: normalizeUserResponse,
      providesTags: ["Users"],
    }),
    getRolesAndPermissions: builder.query<RolesAndPermissions, void>({
      query: () => "/users/roles",
      transformResponse: normalizeRolesAndPermissionsResponse,
      providesTags: ["Users"],
    }),
    createUser: builder.mutation<User, UserFormPayload>({
      query: (data) => ({ url: "/users", method: "POST", body: data }),
      transformResponse: normalizeUserResponse,
      invalidatesTags: ["Users"],
    }),
    updateUser: builder.mutation<User, UserFormPayload & { id: string }>({
      query: ({ id, ...data }) => ({ url: `/users/${id}`, method: "PUT", body: data }),
      transformResponse: normalizeUserResponse,
      invalidatesTags: ["Users", "Auth"],
    }),
    deleteUser: builder.mutation<{ id?: string; deleted?: boolean }, string>({
      query: (id) => ({ url: `/users/${id}`, method: "DELETE" }),
      transformResponse: (response: { success?: boolean; data?: { id?: string; deleted?: boolean } }) =>
        unwrapApiData(response),
      invalidatesTags: ["Users"],
    }),
  }),
});

export const {
  useGetUsersQuery,
  useGetUserByIdQuery,
  useGetRolesAndPermissionsQuery,
  useLazyGetRolesAndPermissionsQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
} = usersApi;
