import mongoose, { type QueryFilter } from "mongoose";
import {
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_PRIORITY_VALUES,
  NOTIFICATION_TYPES,
  type NotificationPriority,
  type NotificationType,
} from "@/constants/notifications";
import type { NotificationPayload } from "@/realtime/socket.types";
import type { NotificationDocument } from "../models/notification.model";

type EntityType = NonNullable<NotificationPayload["entity"]>["type"];

type NotificationLike = {
  _id: { toString(): string; getTimestamp?(): Date };
  type?: string | null;
  category?: string | null;
  title?: string | null;
  message?: string | null;
  priority?: string | null;
  isRead?: boolean | null;
  seen?: boolean | null;
  status?: string | null;
  userId?: unknown;
  recipientId?: unknown;
  recipient?: unknown;
  user?: unknown;
  projectId?: unknown;
  entityId?: string | null;
  actionUrl?: string | null;
  link?: string | null;
  data?: unknown;
  createdAt?: Date | null;
  updatedAt?: Date | null;
};

const READ_STATUSES = ["read", "seen"];
const RECIPIENT_FIELDS = ["userId", "recipientId", "recipient", "user", "data.userId", "data.recipientId"] as const;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function optionalId(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const id = String(value);
  return id === "[object Object]" ? undefined : id;
}

export function normalizeNotificationPriority(value: unknown): NotificationPriority {
  const normalized = String(value || "").toLowerCase();
  if ((NOTIFICATION_PRIORITY_VALUES as string[]).includes(normalized)) {
    return normalized as NotificationPriority;
  }
  if (["urgent", "emergency"].includes(normalized)) return NOTIFICATION_PRIORITIES.CRITICAL;
  return NOTIFICATION_PRIORITIES.MEDIUM;
}

export function normalizeNotificationType(value: unknown, category?: unknown): NotificationType {
  const normalized = String(value || "").trim();
  const legacyAliases: Record<string, NotificationType> = {
    projectAssigned: NOTIFICATION_TYPES.PROJECT_ASSIGNED,
    project_assigned: NOTIFICATION_TYPES.PROJECT_ASSIGNED,
    taskAssigned: NOTIFICATION_TYPES.TASK_ASSIGNED,
    findingCreated: NOTIFICATION_TYPES.VULNERABILITY_CREATED,
    reportSubmitted: NOTIFICATION_TYPES.PROJECT_REPORT_SUBMITTED,
  };
  if (legacyAliases[normalized]) return legacyAliases[normalized];
  if (Object.values(NOTIFICATION_TYPES).includes(normalized as NotificationType)) {
    return normalized as NotificationType;
  }

  const legacyCategory = String(category || "").toLowerCase();
  if (legacyCategory === "report") return NOTIFICATION_TYPES.PROJECT_REPORT_SUBMITTED;
  if (["finding", "vulnerability", "bug"].includes(legacyCategory)) {
    return NOTIFICATION_TYPES.VULNERABILITY_CREATED;
  }
  return NOTIFICATION_TYPES.SYSTEM_ANNOUNCEMENT;
}

export function isNotificationRead(notification: Pick<NotificationLike, "isRead" | "seen" | "status">): boolean {
  return notification.isRead === true || notification.seen === true || READ_STATUSES.includes(String(notification.status || "").toLowerCase());
}

function inferEntity(type: NotificationType, data: Record<string, unknown>, projectId?: string, entityId?: string) {
  const prefix = type.split(".")[0];
  const entityTypes: Record<string, EntityType> = {
    project: "project",
    task: "task",
    vulnerability: "vulnerability",
    deployment: "deployment",
    ticket: "ticket",
    qa: "qa_result",
    user: "user",
    system: "system",
  };
  const id = entityId || optionalId(data.findingId) || optionalId(data.vulnerabilityId) || optionalId(data.taskId) || projectId;
  return id ? { id, type: entityTypes[prefix] || "system" } : undefined;
}

function safeActionUrl(value: unknown, projectId?: string): string | undefined {
  const url = typeof value === "string" ? value.trim() : "";
  // Notification links are navigation hints, never trusted external redirects.
  if (url.startsWith("/") && !url.startsWith("//")) {
    if (/^\/project\/report\//.test(url) && projectId) return `/projects/${projectId}`;
    return url;
  }
  return projectId ? `/projects/${projectId}` : undefined;
}

export function serializeCompatibleNotification(notification: NotificationLike): NotificationPayload {
  const data = asRecord(notification.data);
  const userId = optionalId(notification.userId) || optionalId(notification.recipientId) || optionalId(notification.recipient) || optionalId(notification.user) || optionalId(data.userId) || optionalId(data.recipientId) || "";
  const projectId = optionalId(notification.projectId) || optionalId(data.projectId) || optionalId(data.project);
  const entityId = notification.entityId || optionalId(data.entityId) || optionalId(data.findingId) || optionalId(data.vulnerabilityId) || optionalId(data.taskId);
  const type = normalizeNotificationType(notification.type, notification.category);
  const createdAt = notification.createdAt || notification._id.getTimestamp?.() || new Date(0);

  return {
    id: notification._id.toString(),
    type,
    title: notification.title || "Notification",
    message: notification.message || "",
    priority: normalizeNotificationPriority(notification.priority),
    isRead: isNotificationRead(notification),
    userId,
    projectId,
    entityId,
    entity: inferEntity(type, data, projectId, entityId),
    actionUrl: safeActionUrl(notification.actionUrl || notification.link, projectId),
    metadata: Object.keys(data).length ? data : undefined,
    createdAt,
    updatedAt: notification.updatedAt || undefined,
  };
}

export function recipientNotificationFilter(userId: string): QueryFilter<NotificationDocument> {
  const values: unknown[] = [userId];
  if (mongoose.isValidObjectId(userId)) values.push(new mongoose.Types.ObjectId(userId));
  return {
    $or: RECIPIENT_FIELDS.flatMap((field) => values.map((value) => ({ [field]: value }))),
  } as QueryFilter<NotificationDocument>;
}

export function readStateNotificationFilter(read: boolean): QueryFilter<NotificationDocument> {
  const readConditions = [
    { isRead: true },
    { seen: true },
    { status: { $in: ["read", "seen", "Read", "Seen"] } },
  ];
  return (read ? { $or: readConditions } : { $nor: readConditions }) as QueryFilter<NotificationDocument>;
}

export function unreadNotificationFilter(userId: string): QueryFilter<NotificationDocument> {
  return {
    $and: [recipientNotificationFilter(userId), readStateNotificationFilter(false)],
  } as QueryFilter<NotificationDocument>;
}
