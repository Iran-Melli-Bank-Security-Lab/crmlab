import { useNavigate } from "react-router-dom";
import { projectTablePresets } from "../columns";
import ProjectTableBase from "../ProjectTableBase";
import type { ProjectTableRow, ProjectTableViewProps } from "../types";

export default function SecurityProjectsTable({
  projects,
  title,
  onAssignPentesters,
}: ProjectTableViewProps) {
  const navigate = useNavigate();
  const openDetails = (project: ProjectTableRow) => {
    navigate(`/projects/${project.id}`);
  };

  return (
    <ProjectTableBase
      paginationId="security-manager"
      title={title}
      projects={projects}
      columns={projectTablePresets.securityManager}
      actionLabel="Details"
      onAction={openDetails}
      onRowClick={openDetails}
      onAssignPentesters={onAssignPentesters}
    />
  );
}
