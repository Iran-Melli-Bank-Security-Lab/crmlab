import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import type { ProjectListView } from "@/shared/types/api/projects";
import type { ProjectTableViewProps } from "./types";

type LazyProjectTableView = LazyExoticComponent<ComponentType<ProjectTableViewProps>>;

export const projectTableViewLoaders: Record<ProjectListView, LazyProjectTableView> = {
  admin: lazy(() => import("./views/AdminProjectsTable")),
  security: lazy(() => import("./views/SecurityProjectsTable")),
  pentest: lazy(() => import("./views/PentestProjectsTable")),
  devops: lazy(() => import("./views/DevOpsProjectsTable")),
  quality: lazy(() => import("./views/QualityProjectsTable")),
  qa: lazy(() => import("./views/QaProjectsTable")),
  representative: lazy(() => import("./views/RepresentativeProjectsTable")),
};
