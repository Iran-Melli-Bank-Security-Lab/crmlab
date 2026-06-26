import type { RequestHandler } from "express";
import { HTTP_STATUS } from "@/constants/http";
import { ROLES } from "@/constants/roles";
import { ProjectModel } from "@/modules/projects/models/project.model";
import { AppError } from "@/utils/AppError";

type ProjectIdSource = "params.id" | "body.projectId";

function getProjectId(req: Parameters<RequestHandler>[0], source: ProjectIdSource) {
  if (source === "params.id") return req.params.id;
  return req.body?.projectId;
}

export function canAccessProject(
  user: Express.UserContext,
  project: {
    ownerId?: unknown;
    projectManager?: unknown;
    qualityManager?: unknown;
    devops?: unknown;
    representative?: unknown;
    assignedUserIds?: unknown[];
  }
) {
  return (
    user.roles.includes(ROLES.ADMIN) ||
    (project.ownerId ? String(project.ownerId) === user.id : false) ||
    (project.projectManager ? String(project.projectManager) === user.id : false) ||
    (project.qualityManager ? String(project.qualityManager) === user.id : false) ||
    (project.devops ? String(project.devops) === user.id : false) ||
    (project.representative ? String(project.representative) === user.id : false) ||
    (project.assignedUserIds || []).some((userId) => String(userId) === user.id)
  );
}

export async function getAccessibleProjectIds(user: Express.UserContext) {
  if (user.roles.includes(ROLES.ADMIN)) return undefined;

  const projects = await ProjectModel.find({
    $or: [
      { ownerId: user.id },
      { projectManager: user.id },
      { qualityManager: user.id },
      { devops: user.id },
      { representative: user.id },
      { assignedUserIds: user.id },
    ],
  }).select("_id");

  return projects.map((project) => project._id);
}

export const requireProjectAccess = (source: ProjectIdSource = "params.id"): RequestHandler => {
  return async (req, _res, next) => {
    try {
      const projectId = getProjectId(req, source);
      const project = projectId ? await ProjectModel.findById(projectId) : null;

      if (!project || !req.user || !canAccessProject(req.user, project)) {
        throw new AppError("Forbidden: project is not assigned to this user", HTTP_STATUS.FORBIDDEN);
      }

      req.project = project;
      next();
    } catch (error) {
      next(error);
    }
  };
};
