import { useNavigate } from "react-router-dom";
import { projectTablePresets } from "../columns";
import ProjectTableBase from "../ProjectTableBase";
import type { ProjectTableRow, ProjectTableViewProps } from "../types";

export default function QaProjectsTable({ projects, title }: ProjectTableViewProps) {
  const navigate = useNavigate();
  const openDetails = (project: ProjectTableRow) => {
    navigate(`/projects/${project.id}`);
  };

  return (
    <ProjectTableBase
      paginationId="qa"
      title={title}
      projects={projects}
      columns={projectTablePresets.qa}
      actionLabel="Details"
      onAction={openDetails}
      onRowClick={openDetails}
    />
  );
}
