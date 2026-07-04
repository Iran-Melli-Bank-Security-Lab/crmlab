import { PERMISSIONS, type Permission } from "@/constants/permissions";
import { HTTP_STATUS } from "@/constants/http";
import { AppError } from "@/utils/AppError";

const CONTEXT_CONFIG = {
  admin: {
    permission: PERMISSIONS.ADMIN_SYSTEM_MANAGE,
    columns: [
      "summary", "projectGroupId", "version", "letterNumber", "platform",
      "discipline", "status", "owner", "assignee", "testExpiresAt", "createdAt",
    ],
  },
  "security-manager": {
    permission: PERMISSIONS.SECURITY_PROJECTS_READ,
    columns: [
      "summary", "status", "priority", "assignee", "riskScore",
      "vulnerabilities", "dueDate",
    ],
  },
  pentest: {
    permission: PERMISSIONS.PENTEST_PROJECTS_READ,
    columns: [
      "summary", "assignmentStatus", "priority", "scope", "phase", "riskScore",
      "vulnerabilities", "assignmentDueDate", "progress",
    ],
  },
  devops: {
    permission: PERMISSIONS.DEVOPS_PROJECTS_READ,
    columns: [
      "summary", "status", "priority", "environment", "repository", "pipeline",
      "lastActivity",
    ],
  },
  "quality-manager": {
    permission: PERMISSIONS.QUALITY_PROJECTS_READ,
    columns: [
      "summary", "status", "priority", "assignee", "testCoverage", "openBugs",
      "dueDate",
    ],
  },
  qa: {
    permission: PERMISSIONS.QA_PROJECTS_READ,
    columns: [
      "summary", "assignmentStatus", "priority", "scope", "phase", "testCoverage",
      "openBugs", "assignmentDueDate", "progress",
    ],
  },
  representative: {
    permission: PERMISSIONS.REPRESENTATIVE_PROJECTS_READ,
    columns: [
      "summary", "projectGroupId", "version", "letterNumber", "platform",
      "discipline", "status", "owner", "assignee", "testExpiresAt", "createdAt",
    ],
  },
} as const;

export type ProjectTableContext = keyof typeof CONTEXT_CONFIG;

export function getAllowedProjectTableContexts(permissions: Permission[]) {
  return (Object.keys(CONTEXT_CONFIG) as ProjectTableContext[]).filter((context) =>
    permissions.includes(CONTEXT_CONFIG[context].permission)
  );
}

export function requireAllowedProjectTableContext(
  context: string,
  permissions: Permission[]
): ProjectTableContext {
  if (!(context in CONTEXT_CONFIG)) {
    throw new AppError("Unknown project table context", HTTP_STATUS.BAD_REQUEST);
  }

  const typedContext = context as ProjectTableContext;
  if (!permissions.includes(CONTEXT_CONFIG[typedContext].permission)) {
    throw new AppError("Forbidden project table context", HTTP_STATUS.FORBIDDEN);
  }
  return typedContext;
}

export function validateProjectTableSettings(
  context: ProjectTableContext,
  body: unknown
) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new AppError("Invalid project table settings", HTTP_STATUS.BAD_REQUEST);
  }

  const input = body as Record<string, unknown>;
  const allowedBodyKeys = new Set(["visibleColumns", "columnOrder", "aliases"]);
  if (Object.keys(input).some((key) => !allowedBodyKeys.has(key))) {
    throw new AppError("Unexpected project table settings field", HTTP_STATUS.BAD_REQUEST);
  }

  const allowedColumns = new Set<string>(CONTEXT_CONFIG[context].columns);
  const readColumns = (value: unknown, field: string) => {
    if (!Array.isArray(value) || value.some((key) => typeof key !== "string")) {
      throw new AppError(`Invalid ${field}`, HTTP_STATUS.BAD_REQUEST);
    }
    const unique = [...new Set(value as string[])];
    if (unique.some((key) => !allowedColumns.has(key))) {
      throw new AppError(`Invalid ${field} column`, HTTP_STATUS.BAD_REQUEST);
    }
    return unique;
  };

  if (!input.aliases || typeof input.aliases !== "object" || Array.isArray(input.aliases)) {
    throw new AppError("Invalid aliases", HTTP_STATUS.BAD_REQUEST);
  }
  const aliases = Object.fromEntries(
    Object.entries(input.aliases as Record<string, unknown>).map(([key, value]) => {
      if (!allowedColumns.has(key) || typeof value !== "string" || value.trim().length > 80) {
        throw new AppError("Invalid column alias", HTTP_STATUS.BAD_REQUEST);
      }
      return [key, value.trim()];
    }).filter(([, value]) => value)
  );

  return {
    visibleColumns: readColumns(input.visibleColumns, "visibleColumns"),
    columnOrder: readColumns(input.columnOrder, "columnOrder"),
    aliases,
  };
}
