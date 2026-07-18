import type { NotificationDocument } from "../models/notification.model";
import { NotificationModel } from "../models/notification.model";
import { type NotificationPriority, type NotificationType } from "@/constants/notifications";
import { SOCKET_EVENTS } from "@/constants/socket";
import { emitToUser } from "@/realtime/socket.delivery";
import type { NotificationPayload } from "@/realtime/socket.types";
import { serializeCompatibleNotification, unreadNotificationFilter } from "./notificationCompatibility.service";

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
  return serializeCompatibleNotification(notification);
}

export async function createNotification(input: CreateNotificationInput) {
  const notification = await NotificationModel.create({
    ...input,
    isRead: false,
  });

  const payload = serializeNotification(notification);
  emitToUser(input.userId, SOCKET_EVENTS.NOTIFICATION_NEW, payload);

  const unreadCount = await NotificationModel.countDocuments(
    unreadNotificationFilter(input.userId)
  );
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
