import { memo, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useGetProjectTableColumnRegistryQuery } from "@/features/ui-state/api/projectTableSettingsApi";
import { useLanguage } from "@/features/language/model";
import { projectTableColumns } from "../columns";
import ProjectTableBase from "../ProjectTableBase";
import type { ProjectTableColumn, ProjectTableRow, ProjectTableViewProps } from "../types";

const localColumns = Object.values(projectTableColumns) as ProjectTableColumn[];

function UserProjectsTable({
  projects,
  title,
  onAssignPentesters,
}: ProjectTableViewProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { data: registry } = useGetProjectTableColumnRegistryQuery("user-projects");
  const definitions = useMemo(
    () => registry?.contexts.find((context) => context.context === "user-projects")?.columns || [],
    [registry]
  );
  const columns = useMemo(
    () => definitions.flatMap((definition) => {
      const local = localColumns.find((column) => String(column.key) === definition.columnKey);
      return local ? [{
        ...local,
        sortable: definition.sortable,
        minW: definition.minWidth || local.minW,
        maxW: definition.maxWidth || local.maxW,
      }] : [];
    }),
    [definitions]
  );

  const openProject = useCallback((project: ProjectTableRow) => {
    if (project.allowedActions?.includes("view-project")) {
      navigate(`/projects/${project.id}`);
    }
  }, [navigate]);
  const openPentestWorkspace = useCallback((project: ProjectTableRow) => {
    if (project.allowedActions?.includes("open-pentest-workspace")) {
      navigate(`/projects/pentest/${project.id}`);
    }
  }, [navigate]);

  const canOpen = projects.some((project) =>
    project.allowedActions?.includes("view-project")
  );
  const canOpenPentestWorkspace = projects.some((project) =>
    project.allowedActions?.includes("open-pentest-workspace")
  );
  const canAssign = Boolean(
    onAssignPentesters &&
    projects.some((project) => project.allowedActions?.includes("assign-pentesters"))
  );

  return (
    <ProjectTableBase
      paginationId="user-projects"
      title={title}
      projects={projects}
      columns={columns}
      actionLabel={t("projectTable.details")}
      onAction={canOpen ? openProject : undefined}
      onRowClick={canOpen ? openProject : undefined}
      onOpenPentestWorkspace={
        canOpenPentestWorkspace ? openPentestWorkspace : undefined
      }
      onAssignPentesters={canAssign ? onAssignPentesters : undefined}
    />
  );
}

export default memo(UserProjectsTable);
