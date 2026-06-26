import type { NotificationDocument } from "../models/notification.model";
import { NotificationModel } from "../models/notification.model";
import { type NotificationPriority, type NotificationType } from "@/constants/notifications";
import { SOCKET_EVENTS } from "@/constants/socket";
import { emitToUser } from "@/realtime/socket.delivery";
import type { NotificationPayload } from "@/realtime/socket.types";

export type CreateNotificationInput = {
  userId: string;
  projectId?: string;
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  actionUrl?: string;
  entityId?: string;
};

export function serializeNotification(
  notification: NotificationDocument
): NotificationPayload {
  return {
    id: notification._id.toString(),
    type: notification.type as NotificationType,
    title: notification.title,
    message: notification.message,
    priority: notification.priority,
    isRead: notification.isRead,
    userId: String(notification.userId),
    projectId: notification.projectId ? String(notification.projectId) : undefined,
    entityId: notification.entityId || undefined,
    actionUrl: notification.actionUrl || undefined,
    createdAt: notification.createdAt,
  };
}

export async function createNotification(input: CreateNotificationInput) {
  const notification = await NotificationModel.create({
    ...input,
    isRead: false,
  });

  const payload = serializeNotification(notification);
  emitToUser(input.userId, SOCKET_EVENTS.NOTIFICATION_NEW, payload);

  const unreadCount = await NotificationModel.countDocuments({
    userId: input.userId,
    isRead: false,
  });
  emitToUser(input.userId, SOCKET_EVENTS.NOTIFICATIONS_UNREAD_COUNT, {
    count: unreadCount,
  });

  return payload;
}

export async function createNotifications(
  inputs: readonly CreateNotificationInput[]
): Promise<NotificationPayload[]> {
  return Promise.all(inputs.map(createNotification));
}
