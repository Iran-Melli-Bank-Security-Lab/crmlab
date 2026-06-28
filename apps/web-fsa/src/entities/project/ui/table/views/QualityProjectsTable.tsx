import { useNavigate } from "react-router-dom";
import { projectTablePresets } from "../columns";
import ProjectTableBase from "../ProjectTableBase";
import type { ProjectTableRow, ProjectTableViewProps } from "../types";

export default function QualityProjectsTable({ projects, title }: ProjectTableViewProps) {
  const navigate = useNavigate();
  const openDetails = (project: ProjectTableRow) => {
    navigate(`/projects/${project.id}`);
  };

  return (
    <ProjectTableBase
      paginationId="quality-manager"
      title={title}
      projects={projects}
      columns={projectTablePresets.qualityManager}
      actionLabel="Details"
      onAction={openDetails}
      onRowClick={openDetails}
    />
  );
}
