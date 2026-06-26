import { projectTablePresets } from "../columns";
import ProjectTableBase from "../ProjectTableBase";
import type { ProjectTableViewProps } from "../types";

export default function QualityProjectsTable({ projects, title }: ProjectTableViewProps) {
  return (
    <ProjectTableBase
      title={title}
      projects={projects}
      columns={projectTablePresets.qualityManager}
    />
  );
}
