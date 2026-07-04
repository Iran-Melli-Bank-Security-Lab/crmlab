import type { Permission } from "@/constants/permissions";
import { HTTP_STATUS } from "@/constants/http";
import { AppError } from "@/utils/AppError";
import {
  PROJECT_TABLE_CONTEXT_REGISTRY,
  getProjectTableColumnDefinitions,
  type ProjectTableContext,
} from "../models/projectTableColumnRegistry.model";

export type { ProjectTableContext } from "../models/projectTableColumnRegistry.model";

export function getAllowedProjectTableContexts(permissions: Permission[]) {
  return (Object.keys(PROJECT_TABLE_CONTEXT_REGISTRY) as ProjectTableContext[]).filter((context) =>
    permissions.includes(PROJECT_TABLE_CONTEXT_REGISTRY[context].requiredPermission)
  );
}

export function getAllowedProjectTableColumnRegistry(permissions: Permission[]) {
  return getAllowedProjectTableContexts(permissions).map((context) => ({
    context,
    defaultLabel: PROJECT_TABLE_CONTEXT_REGISTRY[context].defaultLabel,
    faLabel: PROJECT_TABLE_CONTEXT_REGISTRY[context].faLabel,
    columns: getProjectTableColumnDefinitions(context),
  }));
}

export function requireAllowedProjectTableContext(
  context: string,
  permissions: Permission[]
): ProjectTableContext {
  if (!(context in PROJECT_TABLE_CONTEXT_REGISTRY)) {
    throw new AppError("Unknown project table context", HTTP_STATUS.BAD_REQUEST);
  }

  const typedContext = context as ProjectTableContext;
  if (!permissions.includes(PROJECT_TABLE_CONTEXT_REGISTRY[typedContext].requiredPermission)) {
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

  const allowedColumns = new Set<string>(
    getProjectTableColumnDefinitions(context)
      .filter((column) => column.isConfigurable && !column.isSensitive)
      .map((column) => column.columnKey)
  );
  const readColumns = (value: unknown, field: string) => {
    if (!Array.isArray(value) || value.some((key) => typeof key !== "string")) {
      throw new AppError(`Invalid ${field}`, HTTP_STATUS.BAD_REQUEST);
    }
    return [...new Set(value as string[])].filter((key) => allowedColumns.has(key));
  };

  if (!input.aliases || typeof input.aliases !== "object" || Array.isArray(input.aliases)) {
    throw new AppError("Invalid aliases", HTTP_STATUS.BAD_REQUEST);
  }
  const aliases = Object.fromEntries(
    Object.entries(input.aliases as Record<string, unknown>).map(([key, value]) => {
      if (typeof value !== "string" || value.trim().length > 80) {
        throw new AppError("Invalid column alias", HTTP_STATUS.BAD_REQUEST);
      }
      return [key, value.trim()];
    }).filter(([key, value]) => allowedColumns.has(key) && value)
  );

  return {
    visibleColumns: readColumns(input.visibleColumns, "visibleColumns"),
    columnOrder: readColumns(input.columnOrder, "columnOrder"),
    aliases,
  };
}
