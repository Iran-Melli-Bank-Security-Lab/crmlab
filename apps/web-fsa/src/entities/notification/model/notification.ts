import type {
  NotificationContract,
  NotificationEntityContract,
  NotificationPageContract,
  NotificationPriorityContract,
  NotificationReadFilterContract,
  NotificationTypeContract,
} from "@role-dashboard/contracts";

export type NotificationType = NotificationTypeContract;
export type NotificationPriority = NotificationPriorityContract;

export function normalizeNotificationPriority(value: unknown): NotificationPriority {
  const normalized = String(value || "").toLowerCase();
  if (["low", "medium", "high", "critical"].includes(normalized)) {
    return normalized as NotificationPriority;
  }
  if (normalized === "urgent" || normalized === "emergency") return "critical";
  return "medium";
}
export type NotificationChannel = "in_app" | "email" | "sms" | "push";
export type NotificationDeliveryStatus = "queued" | "delivered" | "read" | "failed";

export type NotificationActor = {
  id: string;
  name: string;
  role?: string;
};

export type NotificationEntity = NotificationEntityContract;

export type AppNotification = NotificationContract & {
  expiresAt?: string;
  roleIds?: string[];
  channels?: NotificationChannel[];
  deliveryStatus?: NotificationDeliveryStatus;

  actor?: NotificationActor;
};

export type NotificationConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export type NotificationSocketEvent =
  | { event: "notification:new"; payload: AppNotification }
  | { event: "notification:updated"; payload: AppNotification }
  | { event: "notification:deleted"; payload: { id: string } }
  | { event: "notifications:sync"; payload: AppNotification[] }
  | { event: "notifications:unread_count"; payload: { count: number } };

export type NotificationReadFilter = NotificationReadFilterContract;

export type NotificationPage = Omit<NotificationPageContract, "items"> & { items: AppNotification[] };

export function normalizeNotification(notification: AppNotification): AppNotification {
  const createdAtValue = notification.createdAt as unknown;
  const updatedAtValue = notification.updatedAt as unknown;
  return {
    ...notification,
    id: String(notification.id),
    createdAt: createdAtValue instanceof Date ? createdAtValue.toISOString() : String(createdAtValue),
    updatedAt: updatedAtValue instanceof Date ? updatedAtValue.toISOString() : updatedAtValue ? String(updatedAtValue) : undefined,
    isRead: Boolean(notification.isRead),
    priority: normalizeNotificationPriority(notification.priority),
  };
}
