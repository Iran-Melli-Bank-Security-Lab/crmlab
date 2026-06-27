import type { ProjectTableColumn, ProjectTableRow } from "./types";

export function formatDate(value?: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function formatCompactGroupId(value?: string) {
  if (!value) return "-";
  return value.length > 10 ? `${value.slice(0, 8)}...` : value;
}

export function normalize(value: unknown) {
  if (value === undefined) return "";
  if (Array.isArray(value)) return value.join(" ").toLowerCase();
  if (typeof value === "number") return value;
  if (typeof value === "string") return value.toLowerCase();
  return "";
}

export function getDefaultSortValue(
  project: ProjectTableRow,
  key: ProjectTableColumn["key"]
) {
  if (key === "summary") return project.name;
  const value = project[key];
  if (Array.isArray(value)) return value;
  if (typeof value === "number" || typeof value === "string") return value;
  return "";
}
