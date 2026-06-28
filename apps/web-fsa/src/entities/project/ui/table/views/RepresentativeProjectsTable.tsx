import { useNavigate } from "react-router-dom";
import { projectTablePresets } from "../columns";
import ProjectTableBase from "../ProjectTableBase";
import type { ProjectTableRow, ProjectTableViewProps } from "../types";

export default function RepresentativeProjectsTable({
  projects,
  title,
}: ProjectTableViewProps) {
  const navigate = useNavigate();
  const openDetails = (project: ProjectTableRow) => {
    navigate(`/projects/${project.id}`);
  };

  return (
    <ProjectTableBase
      paginationId="representative"
      title={title}
      projects={projects}
      columns={projectTablePresets.admin}
      actionLabel="Details"
      onAction={openDetails}
      onRowClick={openDetails}
    />
  );
}
