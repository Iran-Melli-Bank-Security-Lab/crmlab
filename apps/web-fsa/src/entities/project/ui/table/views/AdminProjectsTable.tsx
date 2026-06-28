import { useNavigate } from "react-router-dom";
import { projectTablePresets } from "../columns";
import ProjectTableBase from "../ProjectTableBase";
import type { ProjectTableRow, ProjectTableViewProps } from "../types";

export default function AdminProjectsTable({
  projects,
  title,
  onCreateFromProject,
}: ProjectTableViewProps) {
  const navigate = useNavigate();
  const openDetails = (project: ProjectTableRow) => {
    navigate(`/projects/${project.id}`);
  };

  return (
    <ProjectTableBase
      paginationId="admin"
      title={title}
      projects={projects}
      columns={projectTablePresets.admin}
      actionLabel="Details"
      onAction={openDetails}
      onRowClick={openDetails}
      onCreateFromProject={onCreateFromProject}
    />
  );
}
