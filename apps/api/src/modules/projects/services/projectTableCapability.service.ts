import {
  PROJECT_RESPONSIBILITY_REGISTRY,
  type ProjectResponsibilityContextContract,
} from "@role-dashboard/contracts";
import { HTTP_STATUS } from "@/constants/http";
import { PERMISSIONS, type Permission } from "@/constants/permissions";
import { PROJECT_ASSIGNMENT_ROLES, PROJECT_TYPES } from "@/constants/projects";
import { AppError } from "@/utils/AppError";
import {
  PROJECT_TABLE_COLUMN_CATALOG,
  PROJECT_TABLE_COLUMN_VIEWS,
  getProjectColumnSourceFields,
  getProjectTableColumnDefinitions,
} from "@/modules/settings/models/projectTableColumnRegistry.model";

export const NON_ADMIN_PROJECT_VIEWS = [
  "security", "pentest", "devops", "quality", "qa", "representative",
] as const;
export type NonAdminProjectView = typeof NON_ADMIN_PROJECT_VIEWS[number];
export type ProjectListMode = "admin" | "unified" | NonAdminProjectView;
export type ProjectRowAction =
  | "view-project"
  | "open-pentest-workspace"
  | "view-project-bugs"
  | "assign-pentesters"
  | "assign-project-members"
  | "review-security-bugs";

export const PROJECT_VIEW_PERMISSIONS = Object.fromEntries(
  NON_ADMIN_PROJECT_VIEWS.map((view) => [
    view,
    [...new Set(PROJECT_RESPONSIBILITY_REGISTRY
      .filter((definition) => definition.projectViews.includes(view))
      .flatMap((definition) => definition.readPermissions))],
  ])
) as Record<NonAdminProjectView, Permission[]>;

export function requireProjectListView(
  value: unknown,
  permissions: readonly Permission[]
): ProjectListMode {
  const view = typeof value === "string" ? value : "";
  if (view === "admin") {
    if (!permissions.includes(PERMISSIONS.ADMIN_SYSTEM_MANAGE)) {
      throw new AppError("Forbidden project view", HTTP_STATUS.FORBIDDEN);
    }
    return view;
  }
  if (!view) {
    if (!Object.values(PROJECT_VIEW_PERMISSIONS).some((requiredPermissions) =>
      requiredPermissions.some((permission) => permissions.includes(permission))
    )) {
      throw new AppError("Forbidden project list", HTTP_STATUS.FORBIDDEN);
    }
    return "unified";
  }
  if (!(NON_ADMIN_PROJECT_VIEWS as readonly string[]).includes(view)) {
    throw new AppError("Unknown project view", HTTP_STATUS.BAD_REQUEST);
  }
  const typedView = view as NonAdminProjectView;
  if (!PROJECT_VIEW_PERMISSIONS[typedView].some((permission) =>
    permissions.includes(permission)
  )) {
    throw new AppError("Forbidden project view", HTTP_STATUS.FORBIDDEN);
  }
  return typedView;
}

export function resolveProjectRowActions(
  context: ProjectResponsibilityContextContract,
  view?: NonAdminProjectView
): ProjectRowAction[] {
  return (Object.keys(context.capabilities) as ProjectRowAction[])
    .filter((action): action is ProjectRowAction =>
      (action === "view-project" ||
        action === "open-pentest-workspace" ||
        action === "view-project-bugs" ||
        action === "assign-pentesters" ||
        action === "assign-project-members" ||
        action === "review-security-bugs") &&
      context.capabilities[action] &&
      (!view ||
      action === "view-project" ||
      (action === "open-pentest-workspace" && view === "pentest") ||
      (action === "view-project-bugs" && view === "pentest") ||
      (action === "assign-pentesters" && view === "security") ||
      (action === "assign-project-members" &&
        (view === "security" || view === "quality")) ||
      (action === "review-security-bugs" && view === "security"))
    );
}

export function assertProjectAssignmentActionAllowed(
  permissions: readonly Permission[],
  assignmentRole: string,
  projectType?: string | null
) {
  if (permissions.includes(PERMISSIONS.ADMIN_SYSTEM_MANAGE)) return;
  const isPentestAssignment = assignmentRole === PROJECT_ASSIGNMENT_ROLES.PENTESTER;
  const isQaAssignment = assignmentRole === PROJECT_ASSIGNMENT_ROLES.QA;
  if (
    (isPentestAssignment && projectType !== PROJECT_TYPES.SECURITY) ||
    (isQaAssignment && projectType !== PROJECT_TYPES.QUALITY)
  ) {
    throw new AppError("Assignment role is not valid for this project workflow", HTTP_STATUS.FORBIDDEN);
  }
  const required = isPentestAssignment
    ? PERMISSIONS.SECURITY_PROJECTS_ASSIGN
    : isQaAssignment
      ? PERMISSIONS.QUALITY_PROJECTS_ASSIGN
      : projectType === PROJECT_TYPES.SECURITY
        ? PERMISSIONS.SECURITY_PROJECTS_ASSIGN
        : projectType === PROJECT_TYPES.QUALITY
          ? PERMISSIONS.QUALITY_PROJECTS_ASSIGN
          : undefined;
  if (!required || !permissions.includes(required)) {
    throw new AppError("Forbidden project assignment action", HTTP_STATUS.FORBIDDEN);
  }
}

function readStringList(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  const values = Array.isArray(value) ? value : String(value).split(",");
  if (values.some((item) => typeof item !== "string")) {
    throw new AppError("Invalid requested columns", HTTP_STATUS.BAD_REQUEST);
  }
  return [...new Set(values.map((item) => item.trim()).filter(Boolean))];
}

export function resolveRequestedProjectColumns(
  value: unknown,
  permissions: readonly Permission[],
  view?: NonAdminProjectView
) {
  const allowed = getProjectTableColumnDefinitions("user-projects", [...permissions])
    .filter((column) => !view || PROJECT_TABLE_COLUMN_VIEWS[column.columnKey]?.includes(view));
  const allowedKeys = new Set(allowed.map((column) => column.columnKey));
  const requested = readStringList(value);
  if (!requested) return allowed;
  const unauthorized = requested.filter((key) => !allowedKeys.has(key));
  if (unauthorized.length) {
    throw new AppError(
      `Unauthorized project columns: ${unauthorized.join(", ")}`,
      HTTP_STATUS.FORBIDDEN
    );
  }
  const requestedSet = new Set(requested);
  return allowed.filter((column) => column.isMandatory || requestedSet.has(column.columnKey));
}

export function resolveProjectRowSourceFields(
  permissions: readonly Permission[],
  rowViews: readonly NonAdminProjectView[],
  requestedColumnKeys: readonly string[]
) {
  const requested = new Set(requestedColumnKeys);
  const rowColumnKeys = new Set(rowViews.flatMap((view) =>
    resolveRequestedProjectColumns(undefined, permissions, view)
      .map((column) => column.columnKey)
  ));
  return getProjectColumnSourceFields(
    [...rowColumnKeys].filter((columnKey) => requested.has(columnKey))
  );
}

export type ProjectListQueryCapabilities = {
  columnKeys: string[];
  projectionFields: string[];
  sort?: { field: string; direction: 1 | -1 };
  filters: Record<string, string>;
  search?: string;
  page?: number;
  pageSize?: number;
};

function positiveInteger(value: unknown, name: string, maximum: number) {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > maximum) {
    throw new AppError(`Invalid ${name}`, HTTP_STATUS.BAD_REQUEST);
  }
  return parsed;
}

export function resolveProjectListQueryCapabilities(
  query: Record<string, unknown>,
  permissions: readonly Permission[],
  view?: NonAdminProjectView
): ProjectListQueryCapabilities {
  const columns = resolveRequestedProjectColumns(query.columns, permissions, view);
  const byKey = new Map(columns.map((column) => [column.columnKey, column]));
  const sortKey = typeof query.sort === "string" ? query.sort : undefined;
  let sort: ProjectListQueryCapabilities["sort"];
  if (sortKey) {
    const definition = byKey.get(sortKey);
    const sourceField = PROJECT_TABLE_COLUMN_CATALOG[sortKey]?.sourceFields[0];
    if (!definition?.sortable || !sourceField) {
      throw new AppError("Unauthorized project sort field", HTTP_STATUS.FORBIDDEN);
    }
    if (query.direction !== undefined && query.direction !== "asc" && query.direction !== "desc") {
      throw new AppError("Invalid sort direction", HTTP_STATUS.BAD_REQUEST);
    }
    sort = { field: sourceField, direction: query.direction === "desc" ? -1 : 1 };
  }

  let requestedFilters: Record<string, unknown> = {};
  if (query.filters !== undefined) {
    try {
      const parsed = typeof query.filters === "string" ? JSON.parse(query.filters) : query.filters;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
      requestedFilters = parsed as Record<string, unknown>;
    } catch {
      throw new AppError("Invalid project filters", HTTP_STATUS.BAD_REQUEST);
    }
  }
  const filters: Record<string, string> = {};
  for (const [key, value] of Object.entries(requestedFilters)) {
    const definition = byKey.get(key);
    if (!definition?.filterable) {
      throw new AppError(`Unauthorized project filter field: ${key}`, HTTP_STATUS.FORBIDDEN);
    }
    if (typeof value !== "string" || value.length > 120) {
      throw new AppError("Invalid project filter value", HTTP_STATUS.BAD_REQUEST);
    }
    filters[key] = value;
  }
  const search = query.search === undefined ? undefined : String(query.search).trim();
  if (search && (!byKey.get("summary")?.filterable || search.length > 120)) {
    throw new AppError("Invalid project search", HTTP_STATUS.BAD_REQUEST);
  }

  return {
    columnKeys: columns.map((column) => column.columnKey),
    projectionFields: ["_id", ...getProjectColumnSourceFields(columns.map((column) => column.columnKey))],
    sort,
    filters,
    search: search || undefined,
    page: positiveInteger(query.page, "page", 1_000_000),
    pageSize: positiveInteger(query.pageSize, "pageSize", 100),
  };
}
