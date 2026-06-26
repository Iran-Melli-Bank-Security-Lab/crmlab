import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import { logout } from "@/features/auth/model/authSlice";
import { API_BASE_URL } from "@/shared/config/backend";

const CSRF_TOKEN_URL = "/auth/csrf-token";
const PUBLIC_AUTH_URLS = new Set([
  "/auth/login",
  "/auth/register",
  "/auth/register-admin",
  CSRF_TOKEN_URL,
]);
let cachedCsrfToken: string | undefined;

type CsrfTokenResponse = {
  success?: boolean;
  data?: {
    csrfToken?: string;
  };
  csrfToken?: string;
};

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  credentials: "include",
});

const getRequestUrl = (args: string | FetchArgs) =>
  typeof args === "string" ? args : args.url;

const isProtectedRequest = (args: string | FetchArgs) =>
  !PUBLIC_AUTH_URLS.has(getRequestUrl(args));

const withCsrfToken = (args: string | FetchArgs, csrfToken: string): FetchArgs => {
  const requestArgs = typeof args === "string" ? { url: args } : args;
  const headers = new globalThis.Headers(
    requestArgs.headers as ConstructorParameters<typeof globalThis.Headers>[0]
  );
  headers.set("x-csrf-token", csrfToken);

  return {
    ...requestArgs,
    headers,
  };
};

const fetchCsrfToken = async (api, extraOptions) => {
  if (cachedCsrfToken) {
    return { data: cachedCsrfToken };
  }

  const result = await rawBaseQuery(CSRF_TOKEN_URL, api, extraOptions);

  if (result.error) {
    return { error: result.error };
  }

  const response = result.data as CsrfTokenResponse;
  const csrfToken = response.data?.csrfToken || response.csrfToken;

  if (!csrfToken) {
    return {
      error: {
        status: "CUSTOM_ERROR",
        error: "CSRF token response did not include a csrfToken",
      } satisfies FetchBaseQueryError,
    };
  }

  cachedCsrfToken = csrfToken;
  return { data: csrfToken };
};

const baseQueryWithCsrf: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  if (!isProtectedRequest(args)) {
    return rawBaseQuery(args, api, extraOptions);
  }

  const csrfResult = await fetchCsrfToken(api, extraOptions);

  if ("error" in csrfResult) {
    return { error: csrfResult.error };
  }

  let result = await rawBaseQuery(
    withCsrfToken(args, csrfResult.data),
    api,
    extraOptions
  );

  if (result.error?.status === 403) {
    cachedCsrfToken = undefined;
    const retryCsrfResult = await fetchCsrfToken(api, extraOptions);

    if ("error" in retryCsrfResult) {
      return { error: retryCsrfResult.error };
    }

    result = await rawBaseQuery(
      withCsrfToken(args, retryCsrfResult.data),
      api,
      extraOptions
    );
  }

  return result;
};

const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let result = await baseQueryWithCsrf(args, api, extraOptions);

  if (result?.error?.status === 401 && isProtectedRequest(args)) {
    const refreshResult = await baseQueryWithCsrf(
      {
        url: "/auth/refresh-token",
        method: "POST",
      },
      api,
      extraOptions
    );

    if (!refreshResult.error) {
      result = await baseQueryWithCsrf(args, api, extraOptions);
    } else {
      cachedCsrfToken = undefined;
      api.dispatch(logout());
    }
  }

  return result;
};

export const api = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    "Auth",
    "Users",
    "Pentest",
    "DevOps",
    "Tickets",
    "QA",
    "Reports",
    "Upload",
    "Notifications",
    "Projects",
  ],
  endpoints: () => ({}),
});
