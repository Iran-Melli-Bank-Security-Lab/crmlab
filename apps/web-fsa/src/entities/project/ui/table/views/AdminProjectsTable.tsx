import { projectTablePresets } from "../columns";
import ProjectTableBase from "../ProjectTableBase";
import type { ProjectTableViewProps } from "../types";

export default function AdminProjectsTable({
  projects,
  title,
  onCreateFromProject,
}: ProjectTableViewProps) {
  return (
    <ProjectTableBase
      title={title}
      projects={projects}
      columns={projectTablePresets.admin}
      onCreateFromProject={onCreateFromProject}
    />
  );
}
