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

export function normalize(value: string | number | string[] | undefined) {
  if (value === undefined) return "";
  if (Array.isArray(value)) return value.join(" ").toLowerCase();
  return typeof value === "number" ? value : value.toLowerCase();
}

export function getDefaultSortValue(
  project: ProjectTableRow,
  key: ProjectTableColumn["key"]
) {
  if (key === "summary") return project.name;
  return project[key] ?? "";
}
