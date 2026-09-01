import { ProjectModel } from "../models/project.model";
import { ProjectAssignmentModel } from "../models/projectAssignment.model";

type ProjectRelationshipSource = {
  _id?: unknown;
  projectId?: unknown;
  project?: unknown;
};

export function collectRelatedProjectIds(
  projects: readonly ProjectRelationshipSource[],
  assignments: readonly ProjectRelationshipSource[]
) {
  return Array.from(new Set([
    ...projects.flatMap((project) => project._id ? [String(project._id)] : []),
    ...assignments.flatMap((assignment) => {
      const projectId = assignment.projectId || assignment.project;
      return projectId ? [String(projectId)] : [];
    }),
  ]));
}

export async function getRelatedProjectIdsForUser(userId: string) {
  const [projects, assignments] = await Promise.all([
    ProjectModel.find({
      $or: [
        { ownerId: userId },
        { projectManager: userId },
        { qualityManager: userId },
        { devops: userId },
        { representative: userId },
        // Compatibility for legacy projects. New assignment writes use
        // ProjectAssignment as their canonical relationship.
        { assignedUserIds: userId },
      ],
    }).select("_id").lean(),
    ProjectAssignmentModel.find({
      $or: [
        { userId },
        { pentester: userId },
        { managerId: userId },
        { manager: userId },
      ],
      status: { $ne: "removed" },
    }).select("projectId project").lean(),
  ]);

  return collectRelatedProjectIds(projects, assignments);
}
