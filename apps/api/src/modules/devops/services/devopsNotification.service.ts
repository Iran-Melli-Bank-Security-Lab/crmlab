import { NOTIFICATION_PRIORITIES, NOTIFICATION_TYPES } from "@/constants/notifications";
import { PROJECT_ASSIGNMENT_STATUS } from "@/constants/projects";
import { ROUTES } from "@/constants/routes";
import { createNotifications } from "@/modules/notifications/services/notification.service";
import { ProjectAssignmentModel } from "@/modules/projects/models/projectAssignment.model";
import { UserModel } from "@/modules/users/models/user.model";

export type DevopsNotificationAction = "created" | "updated";
export type DevopsNotificationMode = "shared" | "personal";

export type DevopsNotificationRequest = {
  projectId: string;
  projectName: string;
  mode: DevopsNotificationMode;
  action: DevopsNotificationAction;
  actorUserId: string;
  operationId: string;
  targetUserIds?: readonly string[];
};

type AssignmentRecipientSource = {
  userId?: unknown;
  pentester?: unknown;
  status?: string | null;
};

export function resolveDevopsNotificationRecipientIds({
  assignments,
  activeUserIds,
  targetUserIds,
}: {
  assignments: readonly AssignmentRecipientSource[];
  activeUserIds: ReadonlySet<string>;
  targetUserIds?: readonly string[];
}) {
  const targets = targetUserIds ? new Set(targetUserIds.map(String)) : undefined;
  const recipientIds = new Set<string>();

  assignments.forEach((assignment) => {
    if (
      assignment.status === PROJECT_ASSIGNMENT_STATUS.REMOVED ||
      assignment.status === PROJECT_ASSIGNMENT_STATUS.FINISHED
    ) return;
    const value = assignment.userId || assignment.pentester;
    if (!value) return;
    const userId = String(value);
    if (!activeUserIds.has(userId) || (targets && !targets.has(userId))) return;
    recipientIds.add(userId);
  });

  return Array.from(recipientIds).sort();
}

export function buildDevopsNotificationInputs(
  request: DevopsNotificationRequest,
  recipientIds: readonly string[]
) {
  const shared = request.mode === "shared";
  const created = request.action === "created";
  const type = created
    ? NOTIFICATION_TYPES.DEVOPS_ACCESS_CREATED
    : NOTIFICATION_TYPES.DEVOPS_ACCESS_UPDATED;
  const title = created ? "DevOps access registered" : "DevOps access updated";
  const message = shared
    ? created
      ? `Shared DevOps access information has been registered for project "${request.projectName}".`
      : `Shared DevOps information for project "${request.projectName}" has been updated.`
    : created
      ? `DevOps access information has been registered for project "${request.projectName}".`
      : `Your DevOps access information for project "${request.projectName}" has been updated.`;

  return recipientIds.map((userId) => ({
    userId,
    projectId: request.projectId,
    type,
    title,
    message,
    priority: NOTIFICATION_PRIORITIES.HIGH,
    actionUrl: ROUTES.FRONTEND.PROJECT_DETAILS(request.projectId),
    entityId: request.projectId,
    dedupeKey: `${type}:${request.projectId}:${request.operationId}`,
    data: {
      mode: request.mode,
      action: request.action,
      actorUserId: request.actorUserId,
    },
  }));
}

export async function notifyDevopsRecipients(request: DevopsNotificationRequest) {
  const assignments = await ProjectAssignmentModel.find({
    $or: [{ projectId: request.projectId }, { project: request.projectId }],
    status: { $nin: [PROJECT_ASSIGNMENT_STATUS.REMOVED, PROJECT_ASSIGNMENT_STATUS.FINISHED] },
  })
    .select("userId pentester status")
    .lean();
  const candidateIds = Array.from(new Set(assignments.flatMap((assignment) => {
    const value = assignment.userId || assignment.pentester;
    return value ? [String(value)] : [];
  })));
  const activeUsers = candidateIds.length
    ? await UserModel.find({
        _id: { $in: candidateIds },
        $and: [
          { $or: [{ isActive: true }, { isActive: { $exists: false } }] },
          { $or: [{ status: { $ne: "Inactive" } }, { status: { $exists: false } }] },
        ],
      }).select("_id").lean()
    : [];
  const recipientIds = resolveDevopsNotificationRecipientIds({
    assignments,
    activeUserIds: new Set(activeUsers.map((user) => String(user._id))),
    targetUserIds: request.targetUserIds,
  });

  return createNotifications(buildDevopsNotificationInputs(request, recipientIds));
}

export async function saveDevopsInfoAndNotify<T>({
  save,
  notification,
  notify = notifyDevopsRecipients,
  logError = console.error,
}: {
  save: () => Promise<T>;
  notification: DevopsNotificationRequest | null;
  notify?: (request: DevopsNotificationRequest) => Promise<unknown>;
  logError?: (...values: unknown[]) => void;
}) {
  const saved = await save();
  if (!notification) return saved;

  try {
    await notify(notification);
  } catch (error) {
    logError("DevOps information was saved, but notification delivery failed", {
      projectId: notification.projectId,
      mode: notification.mode,
      action: notification.action,
      error,
    });
  }
  return saved;
}
