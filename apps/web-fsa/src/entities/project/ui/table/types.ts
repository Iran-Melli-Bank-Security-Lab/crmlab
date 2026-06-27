import type { ReactNode } from "react";
import type { TranslationKey } from "@/features/language/model";
import type { Project, ProjectAssignment } from "@/shared/types";

export type Align = "start" | "center" | "end";
export type SortDirection = "asc" | "desc";
export type ProjectTableRow = Project & Partial<ProjectAssignment>;

export type ProjectTableColumn = {
  key: keyof ProjectTableRow | "summary";
  label: string;
  minW?: string;
  align?: Align;
  sortable?: boolean;
  labelKey?: TranslationKey;
  render?: (
    project: ProjectTableRow,
    t: (key: TranslationKey, values?: Record<string, string | number>) => string
  ) => ReactNode;
  sortValue?: (project: ProjectTableRow) => string | number;
};

export type ProjectTableBaseProps = {
  projects: ProjectTableRow[];
  columns: ProjectTableColumn[];
  title?: string;
  emptyTitle?: string;
  actionLabel?: string;
  onAction?: (project: ProjectTableRow) => void;
  onCreateFromProject?: (project: ProjectTableRow) => void;
  onAssignPentesters?: (project: ProjectTableRow) => void;
};

export type ProjectTableViewProps = {
  projects: ProjectTableRow[];
  title: string;
  onCreateFromProject?: (project: ProjectTableRow) => void;
  onAssignPentesters?: (project: ProjectTableRow) => void;
};
