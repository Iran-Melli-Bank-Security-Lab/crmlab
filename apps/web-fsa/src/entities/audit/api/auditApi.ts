import { api } from "@/shared/api/baseApi";
import { unwrapApiData } from "@/shared/api/unwrapApiData";

export type AuditLogStatus = "success" | "failure";
export type AuditLogSortField =
  | "createdAt"
  | "action"
  | "module"
  | "entityType"
  | "ip"
  | "status";

export type AuditLog = {
  id: string;
  actor?: { id: string; name: string; username?: string };
  action: string;
  module: string;
  resource: { type: string; id?: string };
  project?: { id: string; name?: string };
  status: AuditLogStatus;
  ip?: string;
  userAgent?: string;
  previousValue?: unknown;
  newValue?: unknown;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

export type AuditLogQuery = {
  page: number;
  pageSize: number;
  search?: string;
  user?: string;
  action?: string;
  module?: string;
  project?: string;
  ip?: string;
  status?: AuditLogStatus;
  from?: string;
  to?: string;
  sortBy?: AuditLogSortField;
  sortOrder?: "asc" | "desc";
};

export type AuditLogPage = {
  items: AuditLog[];
  pageInfo: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  policy: {
    mode: "read-only";
    canDelete: false;
    retentionDays: number | null;
  };
};

function queryParams(query: AuditLogQuery) {
  return Object.fromEntries(
    Object.entries(query).filter(([, value]) => value !== undefined && value !== "")
  );
}

export const auditApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getAuditLogs: builder.query<AuditLogPage, AuditLogQuery>({
      query: (query) => ({ url: "/audit-logs", params: queryParams(query) }),
      transformResponse: (response) => unwrapApiData<AuditLogPage>(response),
      providesTags: ["AuditLogs"],
    }),
    getAuditLog: builder.query<AuditLog, string>({
      query: (id) => `/audit-logs/${id}`,
      transformResponse: (response) => unwrapApiData<AuditLog>(response),
      providesTags: (_result, _error, id) => [{ type: "AuditLogs", id }],
    }),
  }),
});

export const { useGetAuditLogsQuery, useGetAuditLogQuery } = auditApi;
