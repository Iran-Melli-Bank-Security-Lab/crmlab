import type { RequestHandler } from "express";
import mongoose from "mongoose";
import { HTTP_STATUS } from "@/constants/http";
import { ROLES } from "@/constants/roles";
import { ProjectModel } from "@/modules/projects/models/project.model";
import { AppError } from "@/utils/AppError";
import { ProjectAssignmentModel } from "@/modules/projects/models/projectAssignment.model";
import type { ProjectCapabilityKey } from "@role-dashboard/contracts";
import {
  assertProjectCapability,
  resolveProjectResponsibilityContext,
} from "@/modules/projects/services/projectResponsibility.service";

type ProjectIdSource = "params.id" | "params.projectId" | "body.projectId";

function getProjectId(req: Parameters<RequestHandler>[0], source: ProjectIdSource) {
  if (source === "params.id") return req.params.id;
  if (source === "params.projectId") return req.params.projectId;
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

  const [projects, assignments] = await Promise.all([
    ProjectModel.find({
      $or: [
        { ownerId: user.id },
        { projectManager: user.id },
        { qualityManager: user.id },
        { devops: user.id },
        { representative: user.id },
        { assignedUserIds: user.id },
      ],
    }).select("_id"),
    ProjectAssignmentModel.find({
      $or: [
        { userId: user.id },
        { pentester: user.id },
        { managerId: user.id },
        { manager: user.id },
      ],
      status: { $ne: "removed" },
    }).select("projectId project"),
  ]);

  return Array.from(new Set([
    ...projects.map((project) => String(project._id)),
    ...assignments.flatMap((assignment) => {
      const projectId = assignment.projectId || assignment.project;
      return projectId ? [String(projectId)] : [];
    }),
  ])).map((id) => new mongoose.Types.ObjectId(id));
}

export const requireProjectAccess = (source: ProjectIdSource = "params.id"): RequestHandler => {
  return async (req, _res, next) => {
    try {
      const projectId = getProjectId(req, source);
      const project = projectId ? await ProjectModel.findById(projectId) : null;

      const hasLegacyAssignment = project && req.user
        ? Boolean(await ProjectAssignmentModel.exists({
            $or: [
              { projectId: project._id, userId: req.user.id },
              { project: project._id, pentester: req.user.id },
              { projectId: project._id, managerId: req.user.id },
              { project: project._id, manager: req.user.id },
            ],
            status: { $ne: "removed" },
          }))
        : false;

      if (!project || !req.user || (!canAccessProject(req.user, project) && !hasLegacyAssignment)) {
        throw new AppError("Forbidden: project is not assigned to this user", HTTP_STATUS.FORBIDDEN);
      }

      req.project = project;
      next();
    } catch (error) {
      next(error);
    }
  };
};

export const requireProjectCapability = (
  capability: ProjectCapabilityKey,
  source: ProjectIdSource = "params.id"
): RequestHandler => {
  return async (req, _res, next) => {
    try {
      const projectId = getProjectId(req, source);
      const project = projectId ? await ProjectModel.findById(projectId) : null;
      if (!project || !req.user) {
        throw new AppError("Forbidden: project capability is unavailable", HTTP_STATUS.FORBIDDEN);
      }
      const assignments = await ProjectAssignmentModel.find({
        $and: [
          { $or: [{ projectId: project._id }, { project: project._id }] },
          { $or: [{ userId: req.user.id }, { pentester: req.user.id }] },
          { status: { $ne: "removed" } },
        ],
      })
        .select("projectId project userId pentester assignmentRole status")
        .lean();
      const context = resolveProjectResponsibilityContext({
        user: req.user,
        project: project.toObject(),
        assignments,
      });
      assertProjectCapability(context, capability);
      req.project = project;
      next();
    } catch (error) {
      next(error);
    }
  };
};
