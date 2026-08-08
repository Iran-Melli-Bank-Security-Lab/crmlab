import type { Permission } from "@/constants/permissions";
import { HTTP_STATUS } from "@/constants/http";
import { AppError } from "@/utils/AppError";
import {
  PROJECT_TABLE_CONTEXT_REGISTRY,
  getProjectTableColumnDefinitions,
  getProjectTableContextRequiredPermission,
  type ProjectTableContext,
} from "../models/projectTableColumnRegistry.model";

export type { ProjectTableContext } from "../models/projectTableColumnRegistry.model";

export function getAllowedProjectTableContexts(permissions: Permission[]) {
  return (Object.keys(PROJECT_TABLE_CONTEXT_REGISTRY) as ProjectTableContext[]).filter(
    (context) => {
      const requiredPermission = getProjectTableContextRequiredPermission(context);
      if (requiredPermission && !permissions.includes(requiredPermission)) return false;
      return context !== "user-projects" ||
        getProjectTableColumnDefinitions(context, permissions).length > 0;
    }
  );
}

export function getAllowedProjectTableColumnRegistry(permissions: Permission[]) {
  return getAllowedProjectTableContexts(permissions).map((context) => ({
    context,
    defaultLabel: PROJECT_TABLE_CONTEXT_REGISTRY[context].defaultLabel,
    faLabel: PROJECT_TABLE_CONTEXT_REGISTRY[context].faLabel,
    columns: getProjectTableColumnDefinitions(context, permissions),
  }));
}

export function requireAllowedProjectTableContext(
  context: string,
  permissions: Permission[]
): ProjectTableContext {
  if (!(context in PROJECT_TABLE_CONTEXT_REGISTRY)) {
    throw new AppError("Unknown project table context", HTTP_STATUS.BAD_REQUEST);
  }
  if (!getAllowedProjectTableContexts(permissions).includes(context as ProjectTableContext)) {
    throw new AppError("Forbidden project table context", HTTP_STATUS.FORBIDDEN);
  }
  return context as ProjectTableContext;
}

type SettingsInput = {
  visibleColumns: unknown;
  columnOrder: unknown;
  aliases: unknown;
};

function readSettingsObject(body: unknown): SettingsInput {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new AppError("Invalid project table settings", HTTP_STATUS.BAD_REQUEST);
  }
  const input = body as Record<string, unknown>;
  const allowedBodyKeys = new Set(["visibleColumns", "columnOrder", "aliases"]);
  if (Object.keys(input).some((key) => !allowedBodyKeys.has(key))) {
    throw new AppError("Unexpected project table settings field", HTTP_STATUS.BAD_REQUEST);
  }
  return input as SettingsInput;
}

function normalizeProjectTableSettings(
  context: ProjectTableContext,
  body: unknown,
  permissions: Permission[],
  rejectUnauthorized: boolean
) {
  const input = readSettingsObject(body);
  const definitions = getProjectTableColumnDefinitions(context, permissions);
  const allowedColumns = new Set(definitions.map((column) => column.columnKey));
  const configurableColumns = new Set(
    definitions.filter((column) => column.isConfigurable).map((column) => column.columnKey)
  );
  const mandatoryColumns = definitions
    .filter((column) => column.isMandatory)
    .map((column) => column.columnKey);

  const readColumns = (value: unknown, field: string) => {
    if (!Array.isArray(value) || value.some((key) => typeof key !== "string")) {
      throw new AppError(`Invalid ${field}`, HTTP_STATUS.BAD_REQUEST);
    }
    const migratePentesterStatusColumn =
      context === "user-projects" &&
      allowedColumns.has("status") &&
      !allowedColumns.has("assignmentStatus");
    const unique = [...new Set((value as string[]).map((key) =>
      migratePentesterStatusColumn && key === "assignmentStatus"
        ? "status"
        : key
    ))];
    const unauthorized = unique.filter((key) => !allowedColumns.has(key));
    if (rejectUnauthorized && unauthorized.length) {
      throw new AppError(`Unauthorized ${field}: ${unauthorized.join(", ")}`, HTTP_STATUS.FORBIDDEN);
    }
    return unique.filter((key) => allowedColumns.has(key));
  };

  if (!input.aliases || typeof input.aliases !== "object" || Array.isArray(input.aliases)) {
    throw new AppError("Invalid aliases", HTTP_STATUS.BAD_REQUEST);
  }
  const aliasEntries = Object.entries(input.aliases as Record<string, unknown>);
  for (const [key, value] of aliasEntries) {
    if (typeof value !== "string" || value.trim().length > 80) {
      throw new AppError("Invalid column alias", HTTP_STATUS.BAD_REQUEST);
    }
    if (rejectUnauthorized && !configurableColumns.has(key)) {
      throw new AppError(`Unauthorized alias: ${key}`, HTTP_STATUS.FORBIDDEN);
    }
  }
  const aliases = Object.fromEntries(aliasEntries
    .map(([key, value]) => [key, String(value).trim()])
    .filter(([key, value]) => configurableColumns.has(key) && value));

  const visible = readColumns(input.visibleColumns, "visibleColumns");
  const order = readColumns(input.columnOrder, "columnOrder");
  const missingLeadingColumns = definitions
    .filter((column) => column.defaultOrder === 0 && !order.includes(column.columnKey))
    .map((column) => column.columnKey);
  return {
    visibleColumns: [...mandatoryColumns, ...visible.filter((key) => !mandatoryColumns.includes(key))],
    columnOrder: [
      ...missingLeadingColumns,
      ...order,
      ...definitions.map((column) => column.columnKey)
        .filter((key) => !order.includes(key) && !missingLeadingColumns.includes(key)),
    ],
    aliases,
  };
}

export function validateProjectTableSettings(
  context: ProjectTableContext,
  body: unknown,
  permissions: Permission[]
) {
  return normalizeProjectTableSettings(context, body, permissions, true);
}

export function sanitizeStoredProjectTableSettings(
  context: ProjectTableContext,
  body: unknown,
  permissions: Permission[]
) {
  return normalizeProjectTableSettings(context, body, permissions, false);
}
