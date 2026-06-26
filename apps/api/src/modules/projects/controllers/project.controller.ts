import type { RequestHandler } from "express";
import type { QueryFilter } from "mongoose";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "@/constants/audit";
import { HTTP_STATUS } from "@/constants/http";
import { NOTIFICATION_PRIORITIES, NOTIFICATION_TYPES } from "@/constants/notifications";
import { PERMISSIONS } from "@/constants/permissions";
import { PROJECT_ASSIGNMENT_ROLES, PROJECT_TYPES, type ProjectAssignmentRole } from "@/constants/projects";
import { ROLES } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import type { Role } from "@/constants/roles";
import { ProjectModel, type ProjectDocument } from "../models/project.model";
import { ProjectAssignmentModel } from "../models/projectAssignment.model";
import { UserModel } from "@/modules/users/models/user.model";
import { toAuthUserContext } from "@/modules/users/services/userAuth.service";
import { writeAuditLog } from "@/modules/audit/services/audit.service";
import { createNotifications } from "@/modules/notifications/services/notification.service";
import {
  addConnectedUsersToProject,
  emitToProject,
} from "@/realtime/socket.delivery";
import { SOCKET_EVENTS } from "@/constants/socket";
import { AppError } from "@/utils/AppError";
import { sendSuccess } from "@/utils/response";
import { mapCreateProjectRequest } from "../services/project.mapper";
import { createProjectRequestSchema } from "../validators/project.validators";

type ProjectRecipientField =
  | "projectManager"
  | "qualityManager"
  | "devops"
  | "representative";
type ProjectAssignableRole = ProjectAssignmentRole;

const recipientRules: Record<
  ProjectRecipientField,
  { label: string; roles?: readonly Role[] }
> = {
  projectManager: {
    label: "project manager",
    // Project manager is a project-level responsibility, not a global RBAC role.
  },
  qualityManager: {
    label: "quality manager",
    // Quality manager is a project-level responsibility, not a global RBAC role.
  },
  devops: { label: "DevOps", roles: [ROLES.DEVOPS] },
  representative: { label: "representative", roles: [ROLES.REPRESENTATIVE] },
};
const assignableRoleRules: Record<
  ProjectAssignableRole,
  { label: string; roles: readonly Role[] }
> = {
  [PROJECT_ASSIGNMENT_ROLES.PENTESTER]: { label: "pentester", roles: [ROLES.PENTESTER] },
  [PROJECT_ASSIGNMENT_ROLES.QA]: { label: "QA engineer", roles: [ROLES.QA] },
  [PROJECT_ASSIGNMENT_ROLES.DEVOPS]: { label: "DevOps engineer", roles: [ROLES.DEVOPS] },
  [PROJECT_ASSIGNMENT_ROLES.MANAGER]: {
    label: "technical manager",
    roles: [ROLES.PROJECT_MANAGER_SECURITY, ROLES.PROJECT_MANAGER_QA],
  },
  [PROJECT_ASSIGNMENT_ROLES.SECURITY_MANAGER]: {
    label: "security manager",
    roles: [ROLES.PROJECT_MANAGER_SECURITY, ROLES.PENTESTER],
  },
  [PROJECT_ASSIGNMENT_ROLES.QUALITY_MANAGER]: {
    label: "quality manager",
    roles: [ROLES.PROJECT_MANAGER_QA, ROLES.QA],
  },
  [PROJECT_ASSIGNMENT_ROLES.DEVOPS_MANAGER]: {
    label: "DevOps manager",
    roles: [ROLES.DEVOPS],
  },
};

function userHasAnyRole(
  user: { roles?: readonly Role[]; devOps?: boolean; security?: boolean; qualityAssurance?: boolean },
  roles: readonly Role[]
) {
  const effectiveRoles = new Set<Role>(user.roles || []);
  if (user.devOps) effectiveRoles.add(ROLES.DEVOPS);
  if (user.security) effectiveRoles.add(ROLES.PENTESTER);
  if (user.qualityAssurance) effectiveRoles.add(ROLES.QA);

  return roles.some((role) => effectiveRoles.has(role));
}

async function validateProjectRecipients(
  recipients: Partial<Record<ProjectRecipientField, string>>
): Promise<void> {
  const entries = Object.entries(recipients).filter(
    (entry): entry is [ProjectRecipientField, string] => Boolean(entry[1])
  );
  const userIds = Array.from(new Set(entries.map(([, userId]) => userId)));
  if (!userIds.length) return;

  const users = await UserModel.find({ _id: { $in: userIds }, isActive: true })
    .select("_id roles devOps security qualityAssurance")
    .lean();
  const usersById = new Map(users.map((user) => [String(user._id), user]));

  for (const [field, userId] of entries) {
    const user = usersById.get(userId);
    if (!user) {
      throw new AppError(
        `Assigned ${recipientRules[field].label} was not found`,
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const effectiveRoles = new Set<Role>(user.roles);
    if (user.devOps) effectiveRoles.add(ROLES.DEVOPS);
    if (user.security) effectiveRoles.add(ROLES.PENTESTER);
    if (user.qualityAssurance) effectiveRoles.add(ROLES.QA);

    const requiredRoles = recipientRules[field].roles;
    const hasRequiredRole = !requiredRoles || requiredRoles.some((role) =>
      effectiveRoles.has(role)
    );
    if (!hasRequiredRole) {
      throw new AppError(
        `Assigned ${recipientRules[field].label} does not have the required role`,
        HTTP_STATUS.BAD_REQUEST
      );
    }
  }
}

function buildProjectRecipientNotifications(
  recipients: Partial<Record<ProjectRecipientField, string>>,
  projectId: string,
  projectName: string
) {
  const rolesByUserId = new Map<string, string[]>();

  for (const [field, userId] of Object.entries(recipients)) {
    if (!userId) continue;

    const roles = rolesByUserId.get(userId) || [];
    roles.push(recipientRules[field as ProjectRecipientField].label);
    rolesByUserId.set(userId, roles);
  }

  return Array.from(rolesByUserId, ([userId, roles]) => ({
    userId,
    projectId,
    type: NOTIFICATION_TYPES.PROJECT_ASSIGNED,
    title: "New project assignment",
    message: `You were assigned to ${projectName} as ${roles.join(" and ")}.`,
    priority: NOTIFICATION_PRIORITIES.HIGH,
    actionUrl: ROUTES.FRONTEND.PROJECT_DETAILS(projectId),
    entityId: projectId,
  }));
}

function buildInitialProjectAssignments({
  assignedById,
  projectId,
  projectManagerId,
  qualityManagerId,
  devopsManagerId,
  projectType,
  version,
}: {
  assignedById: string;
  projectId: string;
  projectManagerId?: string;
  qualityManagerId?: string;
  devopsManagerId?: string;
  projectType?: string | null;
  version?: string | null;
}) {
  const assignmentPairs: Array<{ userId: string; assignmentRole: ProjectAssignableRole }> = [];

  if (projectType === PROJECT_TYPES.SECURITY && projectManagerId) {
    assignmentPairs.push({
      userId: projectManagerId,
      assignmentRole: PROJECT_ASSIGNMENT_ROLES.SECURITY_MANAGER,
    });
  }

  if (projectType === PROJECT_TYPES.QUALITY && qualityManagerId) {
    assignmentPairs.push({
      userId: qualityManagerId,
      assignmentRole: PROJECT_ASSIGNMENT_ROLES.QUALITY_MANAGER,
    });
  }

  if (devopsManagerId) {
    assignmentPairs.push({
      userId: devopsManagerId,
      assignmentRole: PROJECT_ASSIGNMENT_ROLES.DEVOPS_MANAGER,
    });
  }

  const seenAssignments = new Set<string>();
  const managerId = projectManagerId || qualityManagerId;

  return assignmentPairs
    .filter(({ userId, assignmentRole }) => {
      const key = `${userId}:${assignmentRole}`;
      if (seenAssignments.has(key)) return false;
      seenAssignments.add(key);
      return true;
    })
    .map(({ userId, assignmentRole }) => ({
      projectId,
      project: projectId,
      userId,
      pentester: userId,
      managerId,
      manager: managerId,
      assignedById,
      assignmentRole,
      version: version || "initial",
    }));
}

function toProjectEvent(project: {
  _id: { toString(): string };
  projectName: string;
  type?: "security" | "quality" | "devops" | null;
  createdAt: Date;
}) {
  return {
    id: project._id.toString(),
    projectName: project.projectName,
    type: project.type || undefined,
    createdAt: project.createdAt,
  };
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function getProjectListFilter(
  view: unknown,
  user: Express.UserContext
): QueryFilter<ProjectDocument> {
  const userId = user.id;

  switch (view) {
    case "admin":
      return user.permissions.includes(PERMISSIONS.ADMIN_SYSTEM_MANAGE) ? {} : { ownerId: userId };
    case "security":
      return { projectManager: userId, type: PROJECT_TYPES.SECURITY };
    case "quality":
      return {
        type: PROJECT_TYPES.QUALITY,
        $or: [{ qualityManager: userId }, { projectManager: userId }],
      };
    case "devops":
      return { devops: userId };
    case "representative":
      return { representative: userId };
    case "pentest":
    case "qa":
      return { assignedUserIds: userId };
    default:
      if (user.permissions.includes(PERMISSIONS.ADMIN_SYSTEM_MANAGE)) {
        return {};
      }

      return {
        $or: [
          { ownerId: userId },
          { projectManager: userId },
          { qualityManager: userId },
          { devops: userId },
          { representative: userId },
          { assignedUserIds: userId },
        ],
      };
  }
}

export const getProjects: RequestHandler = async (req, res, next) => {
  try {
    const filter = getProjectListFilter(req.query.view, req.user!);
    const projects = await ProjectModel.find(filter).sort({ createdAt: -1 }).lean();
    sendSuccess(res, projects.map((p) => ({ ...p, id: String(p._id) })));
  } catch (error) {
    next(error);
  }
};

export const createProject: RequestHandler = async (req, res, next) => {
  try {
    const request = createProjectRequestSchema.parse(req.body);
    const projectData = mapCreateProjectRequest(request);
    if (request.sourceProjectId) {
      const sourceProject = await ProjectModel.findById(request.sourceProjectId)
        .select("projectGroupId canonicalName projectName")
        .lean();

      if (!sourceProject) {
        throw new AppError("Source project not found", HTTP_STATUS.BAD_REQUEST);
      }

      projectData.projectGroupId = sourceProject.projectGroupId || String(sourceProject._id);
      projectData.canonicalName = sourceProject.canonicalName || undefined;
    }

    const recipients = {
      projectManager: projectData.projectManager,
      qualityManager: projectData.qualityManager,
      devops: projectData.devops,
      representative: projectData.representative,
    };
    await validateProjectRecipients(recipients);
    const projectMemberIds = Array.from(
      new Set([
        req.user!.id,
        projectData.projectManager,
        projectData.qualityManager,
        projectData.devops,
        projectData.representative,
      ].filter(isString))
    );

    const project = await ProjectModel.create({
      ...projectData,
      ownerId: req.user!.id,
    });
    const projectId = project._id.toString();

    await UserModel.updateMany(
      { _id: { $in: projectMemberIds } },
      { $addToSet: { projectIds: projectId } }
    );

    const initialAssignments = buildInitialProjectAssignments({
      assignedById: req.user!.id,
      projectId,
      projectManagerId: projectData.projectManager,
      qualityManagerId: projectData.qualityManager,
      devopsManagerId: projectData.devops,
      projectType: project.type,
      version: project.version,
    });

    if (initialAssignments.length) {
      const createdAssignments = await ProjectAssignmentModel.insertMany(
        initialAssignments,
        { ordered: false }
      );
      project.userProject = createdAssignments.map((assignment) => assignment._id);
      await project.save();
    }

    await createNotifications(
      buildProjectRecipientNotifications(recipients, projectId, project.projectName)
    );

    await addConnectedUsersToProject(projectMemberIds, projectId);
    emitToProject(projectId, SOCKET_EVENTS.PROJECT_CREATED, toProjectEvent(project));

    await writeAuditLog({
      req,
      action: AUDIT_ACTIONS.PROJECT_CREATE,
      entityType: AUDIT_ENTITY_TYPES.PROJECT,
      entityId: projectId,
      metadata: {
        projectName: project.projectName,
        type: project.type,
        projectManagerId: projectData.projectManager,
        devopsManagerId: projectData.devops,
      },
    });

    sendSuccess(res, { ...project.toObject(), id: project._id.toString() }, HTTP_STATUS.CREATED);
  } catch (error) {
    next(error);
  }
};

export const getEligibleProjectAssignees: RequestHandler = async (req, res, next) => {
  try {
    const role = String(req.query.role || "pentester") as ProjectAssignableRole;
    const roleRule = assignableRoleRules[role];

    if (!roleRule) {
      throw new AppError("Unsupported assignee role", HTTP_STATUS.BAD_REQUEST);
    }

    const users = (await UserModel.find({ isActive: true })
      .sort({ firstName: 1, lastName: 1, username: 1 }))
      .filter((user) => userHasAnyRole(user, roleRule.roles));

    sendSuccess(
      res,
      await Promise.all(users.map((user) => toAuthUserContext(user)))
    );
  } catch (error) {
    next(error);
  }
};

export const assignUsersToProject: RequestHandler = async (req, res, next) => {
  try {
    const projectId = String(req.params.id);
    const role = String(
      (req.body as { role?: ProjectAssignableRole }).role || "pentester"
    ) as ProjectAssignableRole;
    const roleRule = assignableRoleRules[role];

    if (!roleRule) {
      throw new AppError("Unsupported assignee role", HTTP_STATUS.BAD_REQUEST);
    }

    const requestedUserIds = Array.from(
      new Set((req.body as { userIds: string[] }).userIds)
    );
    const requestedUserIdSet = new Set(requestedUserIds);
    const existingProject = await ProjectModel.findById(projectId);
    if (!existingProject) {
      throw new AppError("Project not found", HTTP_STATUS.NOT_FOUND);
    }

    const activeUsers = requestedUserIds.length
      ? await UserModel.find({
          _id: { $in: requestedUserIds },
          isActive: true,
        })
          .select("_id roles devOps security qualityAssurance")
          .lean()
      : [];

    if (activeUsers.length !== requestedUserIds.length) {
      throw new AppError(
        "One or more assigned users were not found or are inactive",
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const invalidUsers = activeUsers.filter(
      (user) => !userHasAnyRole(user, roleRule.roles)
    );
    if (invalidUsers.length) {
      throw new AppError(
        `One or more selected users are not eligible ${roleRule.label}s`,
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const existingAssignments = await ProjectAssignmentModel.find({
      projectId,
      assignmentRole: role,
    }).select("_id userId");
    const existingRoleUserIds = new Set(
      existingAssignments
        .map((assignment) => assignment.userId ? String(assignment.userId) : undefined)
        .filter((userId): userId is string => Boolean(userId))
    );
    const addedUserIds = requestedUserIds.filter(
      (userId) => !existingRoleUserIds.has(userId)
    );
    const removedUserIds = Array.from(existingRoleUserIds).filter(
      (userId) => !requestedUserIdSet.has(userId)
    );

    if (removedUserIds.length) {
      await ProjectAssignmentModel.deleteMany({
        projectId,
        assignmentRole: role,
        userId: { $in: removedUserIds },
      });
    }

    if (requestedUserIds.length) {
      await Promise.all(
        requestedUserIds.map((userId) =>
          ProjectAssignmentModel.findOneAndUpdate(
            { projectId, userId, assignmentRole: role, version: existingProject.version },
            {
              $set: {
                projectId,
                project: projectId,
                userId,
                pentester: userId,
                managerId: existingProject.projectManager || existingProject.qualityManager,
                manager: existingProject.projectManager || existingProject.qualityManager,
                assignedById: req.user!.id,
                assignmentRole: role,
                version: existingProject.version,
              },
            },
            { new: true, upsert: true, runValidators: true }
          )
        )
      );
    }

    const remainingAssignments = await ProjectAssignmentModel.find({ projectId }).select("_id userId");
    const nextAssignedUserIds = Array.from(
      new Set(
        remainingAssignments
          .map((assignment) => assignment.userId ? String(assignment.userId) : undefined)
          .filter((userId): userId is string => Boolean(userId))
      )
    );
    const nextAssignmentIds = remainingAssignments.map((assignment) => assignment._id);

    const project = await ProjectModel.findByIdAndUpdate(
      projectId,
      { $set: { assignedUserIds: nextAssignedUserIds, userProject: nextAssignmentIds } },
      { new: true }
    );

    if (addedUserIds.length) {
      await UserModel.updateMany(
        { _id: { $in: addedUserIds } },
        { $addToSet: { projectIds: projectId } }
      );
    }

    const fullyRemovedUserIds = removedUserIds.filter(
      (userId) => !nextAssignedUserIds.includes(userId)
    );

    if (fullyRemovedUserIds.length) {
      await UserModel.updateMany(
        { _id: { $in: fullyRemovedUserIds } },
        { $pull: { projectIds: projectId } }
      );
    }

    if (addedUserIds.length) {
      await createNotifications(
        addedUserIds.map((userId) => ({
          userId,
          projectId,
          type: NOTIFICATION_TYPES.PROJECT_ASSIGNED,
          title: "You were assigned to a project",
          message: `You have been assigned to ${project?.projectName || "a project"}.`,
          priority: NOTIFICATION_PRIORITIES.HIGH,
          actionUrl: ROUTES.FRONTEND.PROJECT_DETAILS(projectId),
          entityId: projectId,
        }))
      );

      await addConnectedUsersToProject(addedUserIds, projectId);
    }

    emitToProject(projectId, SOCKET_EVENTS.PROJECT_ASSIGNED, toProjectEvent(project || existingProject));

    await writeAuditLog({
      req,
      action: AUDIT_ACTIONS.PROJECT_ASSIGN_USERS,
      entityType: AUDIT_ENTITY_TYPES.PROJECT,
      entityId: projectId,
      metadata: { role, assignedUserIds: requestedUserIds, addedUserIds, removedUserIds, fullyRemovedUserIds },
    });

    sendSuccess(res, {
      project,
      assignedUserIds: requestedUserIds,
      addedUserIds,
      removedUserIds,
    });
  } catch (error) {
    next(error);
  }
};
