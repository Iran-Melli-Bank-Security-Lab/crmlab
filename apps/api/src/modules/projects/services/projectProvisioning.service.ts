import { HTTP_STATUS } from "@/constants/http";
import { NOTIFICATION_PRIORITIES, NOTIFICATION_TYPES } from "@/constants/notifications";
import { PERMISSIONS } from "@/constants/permissions";
import {
  PROJECT_ASSIGNMENT_ROLES,
  PROJECT_ASSIGNMENT_STATUS,
  PROJECT_PROVISIONING_STATUS,
  PROJECT_STATUS,
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
import { ProjectAssignmentModel } from "../models/projectAssignment.model";
import { closeProjectAssignmentWorkTimers } from "./projectAssignmentWorkTimer.service";

export const LEGACY_PROJECT_PROVISIONING_STATUS =
  PROJECT_PROVISIONING_STATUS.DEVOPS_READY;

const deadlineFilter = (now: Date) => ({
  $and: [
    { deadlineEnabled: { $ne: false } },
    { $or: [
      { testExpiresAt: { $lte: now } },
      {
        testExpiresAt: { $exists: false },
        expireDay: { $lte: now },
      },
      {
        testExpiresAt: { $exists: false },
        expireDay: { $exists: false },
        expireDayQuality: { $lte: now },
      },
    ] },
  ],
});

export function getProjectDeadline(project: {
  testExpiresAt?: unknown;
  expireDay?: unknown;
  expireDayQuality?: unknown;
}) {
  const value = project.testExpiresAt || project.expireDay || project.expireDayQuality;
  const deadline = value ? new Date(String(value)) : undefined;
  return deadline && !Number.isNaN(deadline.getTime()) ? deadline : undefined;
}

export function getApprovedIndividualDeadline(
  project: {
    deadlineExtensionRequests?: Array<{
      requestedBy?: unknown;
      requestType?: string;
      status?: string;
      approvedDeadline?: unknown;
      requestedDeadline?: unknown;
    }>;
  },
  userId?: string,
  now = new Date()
) {
  if (!userId) return undefined;
  const deadlines = (project.deadlineExtensionRequests || []).flatMap((request) => {
    if (
      String(request.requestedBy || "") !== userId ||
      request.requestType !== "individual" ||
      request.status !== "approved"
    ) return [];
    const value = request.approvedDeadline || request.requestedDeadline;
    const deadline = value ? new Date(String(value)) : undefined;
    return deadline && !Number.isNaN(deadline.getTime()) && deadline > now
      ? [deadline]
      : [];
  });
  return deadlines.sort((left, right) => right.getTime() - left.getTime())[0];
}

export async function closeExpiredProjects(now = new Date()) {
  const filter = {
    status: { $nin: [PROJECT_STATUS.CLOSED, PROJECT_STATUS.FINISHED, PROJECT_STATUS.REMOVED] },
    ...deadlineFilter(now),
  };
  const projects = await ProjectModel.find(filter).select("_id").lean();
  const closedProjects = await Promise.all(projects.map((project) =>
    ProjectModel.findOneAndUpdate(
      { _id: project._id, ...filter },
      {
        $set: {
          status: PROJECT_STATUS.CLOSED,
          closureReason: "deadline",
          deadlineExpiredAt: now,
        },
      },
      { new: false }
    ).select("_id").lean()
  ));
  const projectIds = closedProjects.flatMap((project) =>
    project ? [String(project._id)] : []
  );
  if (!projectIds.length) return;
  await closeProjectAssignmentWorkTimers(projectIds, now);
}

export async function assertProjectOpenForWork(projectId: string, userId?: string) {
  const now = new Date();
  await closeExpiredProjects(now);
  const project = await ProjectModel.findById(projectId)
    .select("status deadlineEnabled closureReason testExpiresAt expireDay expireDayQuality version deadlineExtensionRequests")
    .lean();
  if (!project) throw new AppError("Project not found", HTTP_STATUS.NOT_FOUND);
  const deadline = getProjectDeadline(project);
  const deadlineBlocked = project.deadlineEnabled !== false &&
    Boolean(deadline && deadline.getTime() <= now.getTime()) &&
    !getApprovedIndividualDeadline(project, userId, now);
  const manuallyClosed = project.status === PROJECT_STATUS.FINISHED ||
    project.status === PROJECT_STATUS.REMOVED ||
    (project.status === PROJECT_STATUS.CLOSED && project.closureReason !== "deadline");
  if (manuallyClosed || deadlineBlocked) {
    throw new AppError("This project is closed and no longer accepts work", HTTP_STATUS.CONFLICT);
  }
  return project;
}

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

export function assertAssignedRepresentative(
  project: { representative?: unknown },
  actor: Express.UserContext
) {
  if (String(project.representative || "") !== actor.id) {
    throw new AppError(
      "Only the Lab Representative assigned to this project can submit a resolution",
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
  resolutionMessage?: string;
};

async function transition(input: TransitionInput) {
  await assertProjectOpenForWork(input.projectId, input.actor.id);
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
    resolutionMessage: input.resolutionMessage,
    evidence: input.evidence,
    attemptNumber:
      input.expectedStatus === PROJECT_PROVISIONING_STATUS.READY_FOR_DEVOPS_RETRY &&
      input.newStatus === PROJECT_PROVISIONING_STATUS.DEVOPS_IN_PROGRESS
        ? attemptNumber + 1
        : attemptNumber,
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
    unset.devopsResolutionMessage = 1;
    unset.devopsResolutionSubmittedAt = 1;
    unset.devopsResolutionSubmittedBy = 1;
  }
  if (
    input.expectedStatus === PROJECT_PROVISIONING_STATUS.DEVOPS_BLOCKED &&
    input.newStatus === PROJECT_PROVISIONING_STATUS.READY_FOR_DEVOPS_RETRY
  ) {
    set.devopsResolutionMessage = input.resolutionMessage;
    set.devopsResolutionSubmittedAt = now;
    set.devopsResolutionSubmittedBy = input.actor.id;
    set.provisioningBlockedDurationMs =
      (project.provisioningBlockedDurationMs || 0) + blockedDuration;
    unset.provisioningBlockedAt = 1;
  }
  if (
    input.expectedStatus === PROJECT_PROVISIONING_STATUS.READY_FOR_DEVOPS_RETRY &&
    input.newStatus === PROJECT_PROVISIONING_STATUS.DEVOPS_IN_PROGRESS
  ) {
    set.provisioningAttemptNumber = attemptNumber + 1;
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
    .select("devops")
    .lean();
  if (!accessProject) throw new AppError("Project not found", HTTP_STATUS.NOT_FOUND);
  assertAssignedDevops(accessProject, actor);
  return transition({
    projectId,
    actor,
    expectedStatus: PROJECT_PROVISIONING_STATUS.READY_FOR_DEVOPS_RETRY,
    newStatus: PROJECT_PROVISIONING_STATUS.DEVOPS_IN_PROGRESS,
    notes,
  });
}

async function getDevopsResolutionRecipientIds(
  projectId: string,
  primaryDevopsId?: unknown
) {
  const assignments = await ProjectAssignmentModel.find({
    $or: [{ projectId }, { project: projectId }],
    assignmentRole: {
      $in: [
        PROJECT_ASSIGNMENT_ROLES.DEVOPS,
        PROJECT_ASSIGNMENT_ROLES.DEVOPS_MANAGER,
      ],
    },
    status: {
      $nin: [
        PROJECT_ASSIGNMENT_STATUS.REMOVED,
        PROJECT_ASSIGNMENT_STATUS.FINISHED,
      ],
    },
  })
    .select("userId pentester")
    .lean();
  return Array.from(new Set([
    ...(primaryDevopsId ? [String(primaryDevopsId)] : []),
    ...assignments.flatMap((assignment) => {
      const userId = assignment.userId || assignment.pentester;
      return userId ? [String(userId)] : [];
    }),
  ]));
}

export async function submitProjectProvisioningResolution(
  projectId: string,
  actor: Express.UserContext,
  resolutionMessage: string
) {
  const accessProject = await ProjectModel.findById(projectId)
    .select("representative")
    .lean();
  if (!accessProject) throw new AppError("Project not found", HTTP_STATUS.NOT_FOUND);
  assertAssignedRepresentative(accessProject, actor);
  const result = await transition({
    projectId,
    actor,
    expectedStatus: PROJECT_PROVISIONING_STATUS.DEVOPS_BLOCKED,
    newStatus: PROJECT_PROVISIONING_STATUS.READY_FOR_DEVOPS_RETRY,
    resolutionMessage,
  });
  const recipientIds = await getDevopsResolutionRecipientIds(
    projectId,
    result.project.devops
  );
  await deliverTransitionNotifications(
    projectId,
    recipientIds.map((userId) => ({
      userId,
      projectId,
      type: NOTIFICATION_TYPES.PROJECT_DEVOPS_RESOLUTION_SUBMITTED,
      title: "DevOps setup issue resolved",
      message:
        `The Lab Representative reported that the setup issue for project ` +
        `"${result.project.projectName}" has been resolved.\n\n` +
        `Resolution:\n${resolutionMessage}\n\n` +
        "Please review the resolution and retry the DevOps setup.",
      priority: NOTIFICATION_PRIORITIES.HIGH,
      actionUrl: "/devops",
      entityId: projectId,
      dedupeKey:
        `${NOTIFICATION_TYPES.PROJECT_DEVOPS_RESOLUTION_SUBMITTED}:` +
        `${projectId}:${result.project.provisioningAttemptNumber || 1}`,
      data: {
        resolutionMessage,
        representativeUserId: actor.id,
        attemptNumber: result.project.provisioningAttemptNumber || 1,
      },
    }))
  );
  return result;
}
