import { projectTablePresets } from "../columns";
import ProjectTableBase from "../ProjectTableBase";
import type { ProjectTableViewProps } from "../types";

export default function RepresentativeProjectsTable({
  projects,
  title,
}: ProjectTableViewProps) {
  return (
    <ProjectTableBase
      title={title}
      projects={projects}
      columns={projectTablePresets.admin}
    />
  );
}
