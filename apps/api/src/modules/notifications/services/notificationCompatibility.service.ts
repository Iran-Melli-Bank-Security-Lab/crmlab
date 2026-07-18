import {
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_PRIORITY_VALUES,
  NOTIFICATION_TYPES,
  type NotificationPriority,
  type NotificationType,
} from "@/constants/notifications";
import type { NotificationPayload } from "@/realtime/socket.types";

type NotificationLike = {
  _id: { toString(): string };
  type?: string | null;
  title?: string | null;
  message?: string | null;
  priority?: string | null;
  isRead?: boolean | null;
  seen?: boolean | null;
  userId?: unknown;
  projectId?: unknown;
  entityId?: string | null;
  actionUrl?: string | null;
  link?: string | null;
  createdAt?: Date | null;
};

export function normalizeNotificationPriority(value: unknown): NotificationPriority {
  const normalized = String(value || "").toLowerCase();
  if ((NOTIFICATION_PRIORITY_VALUES as string[]).includes(normalized)) {
    return normalized as NotificationPriority;
  }
  if (["urgent", "emergency"].includes(normalized)) return NOTIFICATION_PRIORITIES.CRITICAL;
  return NOTIFICATION_PRIORITIES.MEDIUM;
}

export function normalizeNotificationType(value: unknown): NotificationType {
  const normalized = String(value || "");
  if (normalized === "projectAssigned") return NOTIFICATION_TYPES.PROJECT_ASSIGNED;
  if (Object.values(NOTIFICATION_TYPES).includes(normalized as NotificationType)) {
    return normalized as NotificationType;
  }
  return NOTIFICATION_TYPES.SYSTEM_ANNOUNCEMENT;
}

export function serializeCompatibleNotification(notification: NotificationLike): NotificationPayload {
  return {
    id: notification._id.toString(),
    type: normalizeNotificationType(notification.type),
    title: notification.title || "Notification",
    message: notification.message || "",
    priority: normalizeNotificationPriority(notification.priority),
    isRead: notification.isRead ?? notification.seen ?? false,
    userId: String(notification.userId || ""),
    projectId: notification.projectId ? String(notification.projectId) : undefined,
    entityId: notification.entityId || undefined,
    actionUrl: notification.actionUrl || notification.link || undefined,
    createdAt: notification.createdAt || new Date(),
  };
}

export function unreadNotificationFilter(userId: string) {
  return {
    userId,
    $or: [
      { isRead: false },
      { isRead: { $exists: false }, seen: { $ne: true } },
    ],
  };
}

