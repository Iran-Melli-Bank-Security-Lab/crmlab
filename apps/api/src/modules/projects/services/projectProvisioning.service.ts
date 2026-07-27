import { HTTP_STATUS } from "@/constants/http";
import { NOTIFICATION_PRIORITIES, NOTIFICATION_TYPES } from "@/constants/notifications";
import { PERMISSIONS } from "@/constants/permissions";
import {
  PROJECT_PROVISIONING_STATUS,
  type ProjectProvisioningStatus,
} from "@/constants/projects";
import { ROLES } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import {
  createNotifications,
  type CreateNotificationInput,
} from "@/modules/notifications/services/notification.service";
import { UserModel } from "@/modules/users/models/user.model";
import { AppError } from "@/utils/AppError";
import { ProjectModel } from "../models/project.model";

export const LEGACY_PROJECT_PROVISIONING_STATUS =
  PROJECT_PROVISIONING_STATUS.DEVOPS_READY;

export function getEffectiveProvisioningStatus(project: {
  provisioningStatus?: string | null;
}): ProjectProvisioningStatus {
  return (project.provisioningStatus as ProjectProvisioningStatus | undefined) ||
    LEGACY_PROJECT_PROVISIONING_STATUS;
}

export function assertProvisioningTransitionAllowed(
  currentStatus: ProjectProvisioningStatus,
  expectedStatus: ProjectProvisioningStatus,
  newStatus: ProjectProvisioningStatus
) {
  if (currentStatus !== expectedStatus) {
    throw new AppError(
      `Invalid provisioning transition from ${currentStatus} to ${newStatus}`,
      HTTP_STATUS.CONFLICT
    );
  }
}

function actorRole(actor: Express.UserContext) {
  return actor.roles.join(",") || "unknown";
}

function isAdmin(actor: Express.UserContext) {
  return actor.permissions.includes(PERMISSIONS.ADMIN_SYSTEM_MANAGE);
}

function assertAssignedDevops(
  project: { devops?: unknown },
  actor: Express.UserContext
) {
  if (!isAdmin(actor) && String(project.devops || "") !== actor.id) {
    throw new AppError(
      "Only the assigned DevOps responsible person or an authorized Admin can perform this action",
      HTTP_STATUS.FORBIDDEN
    );
  }
}

function assertRepresentative(
  project: { representative?: unknown },
  actor: Express.UserContext
) {
  if (!isAdmin(actor) && String(project.representative || "") !== actor.id) {
    throw new AppError(
      "Only the assigned Lab Representative or an authorized Admin can request a retry",
      HTTP_STATUS.FORBIDDEN
    );
  }
}

function statusFilter(status: ProjectProvisioningStatus) {
  if (status === PROJECT_PROVISIONING_STATUS.DEVOPS_READY) {
    return {
      $or: [
        { provisioningStatus: PROJECT_PROVISIONING_STATUS.DEVOPS_READY },
        { provisioningStatus: { $exists: false } },
        { provisioningStatus: null },
      ],
    };
  }
  return { provisioningStatus: status };
}

type TransitionInput = {
  projectId: string;
  actor: Express.UserContext;
  expectedStatus: ProjectProvisioningStatus;
  newStatus: ProjectProvisioningStatus;
  notes?: string;
  failureReason?: string;
  technicalDescription?: string;
  recommendedAction?: string;
  evidence?: string[];
};

async function transition(input: TransitionInput) {
  const project = await ProjectModel.findById(input.projectId)
    .select(
      "projectName type projectManager qualityManager devops representative provisioningStatus provisioningAttemptNumber provisioningBlockedAt provisioningBlockedDurationMs"
    )
    .lean();
  if (!project) throw new AppError("Project not found", HTTP_STATUS.NOT_FOUND);

  const currentStatus = getEffectiveProvisioningStatus(project);
  assertProvisioningTransitionAllowed(
    currentStatus,
    input.expectedStatus,
    input.newStatus
  );

  const now = new Date();
  const attemptNumber = project.provisioningAttemptNumber || 1;
  const blockedDuration =
    project.provisioningBlockedAt &&
    input.expectedStatus === PROJECT_PROVISIONING_STATUS.DEVOPS_BLOCKED
      ? Math.max(0, now.getTime() - project.provisioningBlockedAt.getTime())
      : 0;
  const history = {
    previousStatus: currentStatus,
    newStatus: input.newStatus,
    actingUserId: input.actor.id,
    actingUserRole: actorRole(input.actor),
    timestamp: now,
    notes: input.notes,
    failureReason: input.failureReason,
    technicalDescription: input.technicalDescription,
    recommendedAction: input.recommendedAction,
    evidence: input.evidence,
    attemptNumber,
  };
  const set: Record<string, unknown> = {
    provisioningStatus: input.newStatus,
  };
  const unset: Record<string, 1> = {};

  if (input.newStatus === PROJECT_PROVISIONING_STATUS.DEVOPS_READY) {
    set.devopsConfirmedBy = input.actor.id;
    set.devopsConfirmedAt = now;
    set.devopsNotes = input.notes;
    unset.devopsFailureReason = 1;
    unset.devopsFailureDescription = 1;
    unset.devopsRecommendedAction = 1;
    unset.devopsFailureEvidence = 1;
    unset.devopsFailureAt = 1;
    unset.provisioningBlockedAt = 1;
  }
  if (input.newStatus === PROJECT_PROVISIONING_STATUS.DEVOPS_BLOCKED) {
    set.devopsFailureReason = input.failureReason;
    set.devopsFailureDescription = input.technicalDescription;
    set.devopsRecommendedAction = input.recommendedAction;
    set.devopsFailureEvidence = input.evidence;
    set.devopsFailureAt = now;
    set.provisioningBlockedAt = now;
  }
  if (
    input.expectedStatus === PROJECT_PROVISIONING_STATUS.DEVOPS_BLOCKED &&
    input.newStatus === PROJECT_PROVISIONING_STATUS.AWAITING_DEVOPS_SETUP
  ) {
    set.provisioningAttemptNumber = attemptNumber + 1;
    set.provisioningBlockedDurationMs =
      (project.provisioningBlockedDurationMs || 0) + blockedDuration;
    unset.provisioningBlockedAt = 1;
  }

  const updated = await ProjectModel.findOneAndUpdate(
    { _id: input.projectId, ...statusFilter(input.expectedStatus) },
    {
      $set: set,
      ...(Object.keys(unset).length ? { $unset: unset } : {}),
      $push: { provisioningHistory: history },
    },
    { new: true, runValidators: true }
  );
  if (!updated) {
    throw new AppError(
      "The provisioning state changed while this request was being processed",
      HTTP_STATUS.CONFLICT
    );
  }
  return { project: updated, previousStatus: currentStatus, newStatus: input.newStatus };
}

function projectActionUrl(projectId: string) {
  return ROUTES.FRONTEND.PROJECT_DETAILS(projectId);
}

async function deliverTransitionNotifications(
  projectId: string,
  inputs: readonly CreateNotificationInput[]
) {
  try {
    await createNotifications(inputs);
  } catch (error) {
    console.error("Provisioning transitioned, but notification delivery failed", {
      projectId,
      error,
    });
  }
}

export async function notifyInitialDevopsAssignment(input: {
  projectId: string;
  projectName: string;
  devopsUserId: string;
}) {
  return createNotifications([buildInitialDevopsAssignmentNotification(input)]);
}

export function buildInitialDevopsAssignmentNotification(input: {
  projectId: string;
  projectName: string;
  devopsUserId: string;
}): CreateNotificationInput {
  return {
    userId: input.devopsUserId,
    projectId: input.projectId,
    type: NOTIFICATION_TYPES.PROJECT_DEVOPS_ASSIGNED,
    title: "Project environment preparation assigned",
    message:
      `You have been assigned to prepare the environment for project "${input.projectName}". ` +
      "Please configure and run the OVF, VM, application files, URLs, or other resources provided by the customer.",
    priority: NOTIFICATION_PRIORITIES.HIGH,
    actionUrl: projectActionUrl(input.projectId),
    entityId: input.projectId,
    dedupeKey: `${NOTIFICATION_TYPES.PROJECT_DEVOPS_ASSIGNED}:${input.projectId}:1`,
  };
}

async function activeAdminIds() {
  const admins = await UserModel.find({
    $and: [
      { $or: [{ roles: ROLES.ADMIN }, { "roles.Admin": { $gt: 0 } }] },
      { $or: [{ isActive: true }, { isActive: { $exists: false } }] },
    ],
  }).select("_id").lean();
  return admins.map((admin) => String(admin._id));
}

export async function startProjectProvisioning(
  projectId: string,
  actor: Express.UserContext,
  notes?: string
) {
  const project = await ProjectModel.findById(projectId).select("devops").lean();
  if (!project) throw new AppError("Project not found", HTTP_STATUS.NOT_FOUND);
  assertAssignedDevops(project, actor);
  return transition({
    projectId,
    actor,
    expectedStatus: PROJECT_PROVISIONING_STATUS.AWAITING_DEVOPS_SETUP,
    newStatus: PROJECT_PROVISIONING_STATUS.DEVOPS_IN_PROGRESS,
    notes,
  });
}

export async function confirmProjectProvisioning(
  projectId: string,
  actor: Express.UserContext,
  notes?: string
) {
  const accessProject = await ProjectModel.findById(projectId).select("devops").lean();
  if (!accessProject) throw new AppError("Project not found", HTTP_STATUS.NOT_FOUND);
  assertAssignedDevops(accessProject, actor);
  const result = await transition({
    projectId,
    actor,
    expectedStatus: PROJECT_PROVISIONING_STATUS.DEVOPS_IN_PROGRESS,
    newStatus: PROJECT_PROVISIONING_STATUS.DEVOPS_READY,
    notes,
  });
  const project = result.project;
  const managerId =
    project.type === "quality" ? project.qualityManager || project.projectManager : project.projectManager;
  const adminIds = await activeAdminIds();
  const actorName =
    [actor.firstName, actor.lastName].filter(Boolean).join(" ") || actor.username;
  await deliverTransitionNotifications(projectId, [
    ...adminIds.map((userId) => ({
      userId,
      projectId,
      type: NOTIFICATION_TYPES.PROJECT_DEVOPS_READY,
      title: "DevOps environment ready",
      message:
        `The DevOps environment for project "${project.projectName}" has been prepared and ` +
        `confirmed successfully by ${actorName}.`,
      priority: NOTIFICATION_PRIORITIES.HIGH,
      actionUrl: projectActionUrl(projectId),
      entityId: projectId,
      dedupeKey: `${NOTIFICATION_TYPES.PROJECT_DEVOPS_READY}:${projectId}:${project.provisioningAttemptNumber || 1}`,
    })),
    ...(managerId ? [{
      userId: String(managerId),
      projectId,
      type: NOTIFICATION_TYPES.PROJECT_MANAGER_ACTIVATED,
      title: "Project ready for team assignment",
      message:
        `Project "${project.projectName}" has been assigned to you as Project Manager. ` +
        "The DevOps environment has been prepared successfully and the project is now ready for team assignment.",
      priority: NOTIFICATION_PRIORITIES.HIGH,
      actionUrl: projectActionUrl(projectId),
      entityId: projectId,
      dedupeKey: `${NOTIFICATION_TYPES.PROJECT_MANAGER_ACTIVATED}:${projectId}:${project.provisioningAttemptNumber || 1}`,
    }] : []),
  ]);
  return result;
}

export async function blockProjectProvisioning(
  projectId: string,
  actor: Express.UserContext,
  input: {
    failureReason: string;
    technicalDescription: string;
    recommendedAction?: string;
    evidence?: string[];
  }
) {
  const accessProject = await ProjectModel.findById(projectId).select("devops").lean();
  if (!accessProject) throw new AppError("Project not found", HTTP_STATUS.NOT_FOUND);
  assertAssignedDevops(accessProject, actor);
  const result = await transition({
    projectId,
    actor,
    expectedStatus: PROJECT_PROVISIONING_STATUS.DEVOPS_IN_PROGRESS,
    newStatus: PROJECT_PROVISIONING_STATUS.DEVOPS_BLOCKED,
    ...input,
  });
  const representativeId = result.project.representative;
  if (representativeId) {
    await deliverTransitionNotifications(projectId, [{
      userId: String(representativeId),
      projectId,
      type: NOTIFICATION_TYPES.PROJECT_DEVOPS_BLOCKED,
      title: "DevOps environment setup blocked",
      message:
        `DevOps could not prepare the environment for project "${result.project.projectName}".\n\n` +
        `Reason:\n${input.failureReason}\n\n` +
        "Please follow up with the customer or the relevant internal team.",
      priority: NOTIFICATION_PRIORITIES.CRITICAL,
      actionUrl: projectActionUrl(projectId),
      entityId: projectId,
      dedupeKey: `${NOTIFICATION_TYPES.PROJECT_DEVOPS_BLOCKED}:${projectId}:${result.project.provisioningAttemptNumber || 1}`,
    }]);
  }
  return result;
}

export async function retryProjectProvisioning(
  projectId: string,
  actor: Express.UserContext,
  notes?: string
) {
  const accessProject = await ProjectModel.findById(projectId)
    .select("representative")
    .lean();
  if (!accessProject) throw new AppError("Project not found", HTTP_STATUS.NOT_FOUND);
  assertRepresentative(accessProject, actor);
  const result = await transition({
    projectId,
    actor,
    expectedStatus: PROJECT_PROVISIONING_STATUS.DEVOPS_BLOCKED,
    newStatus: PROJECT_PROVISIONING_STATUS.AWAITING_DEVOPS_SETUP,
    notes,
  });
  if (result.project.devops) {
    await deliverTransitionNotifications(projectId, [{
      userId: String(result.project.devops),
      projectId,
      type: NOTIFICATION_TYPES.PROJECT_DEVOPS_RETRY_REQUESTED,
      title: "DevOps setup retry requested",
      message:
        `The reported environment issue for project "${result.project.projectName}" has been followed up. ` +
        "Please retry the DevOps setup.",
      priority: NOTIFICATION_PRIORITIES.HIGH,
      actionUrl: projectActionUrl(projectId),
      entityId: projectId,
      dedupeKey:
        `${NOTIFICATION_TYPES.PROJECT_DEVOPS_RETRY_REQUESTED}:${projectId}:` +
        `${result.project.provisioningAttemptNumber || 1}`,
    }]);
  }
  return result;
}
