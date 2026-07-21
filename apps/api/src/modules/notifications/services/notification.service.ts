import mongoose, { type QueryFilter } from "mongoose";
import type { NotificationDocument } from "../models/notification.model";
import { NotificationModel } from "../models/notification.model";
import { type NotificationPriority, type NotificationType } from "@/constants/notifications";
import { SOCKET_EVENTS } from "@/constants/socket";
import { emitToUser } from "@/realtime/socket.delivery";
import type { NotificationPayload } from "@/realtime/socket.types";
import {
  readStateNotificationFilter,
  recipientNotificationFilter,
  serializeCompatibleNotification,
  unreadNotificationFilter,
} from "./notificationCompatibility.service";

export type CreateNotificationInput = {
  userId: string;
  projectId?: string;
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  actionUrl?: string;
  entityId?: string;
  data?: Record<string, unknown>;
  dedupeKey?: string;
};

export type NotificationReadFilter = "all" | "read" | "unread";

export type NotificationListOptions = {
  cursor?: string;
  limit?: number;
  read?: NotificationReadFilter;
};

export type NotificationListResult = {
  items: NotificationPayload[];
  pageInfo: { nextCursor?: string; hasMore: boolean };
  unreadCount: number;
};

type CursorValue = { createdAt: string; id: string };

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

export function serializeNotification(notification: NotificationDocument): NotificationPayload {
  return serializeCompatibleNotification(notification);
}

function encodeCursor(notification: NotificationDocument): string {
  return Buffer.from(JSON.stringify({
    createdAt: (notification.createdAt || notification._id.getTimestamp()).toISOString(),
    id: notification._id.toString(),
  } satisfies CursorValue)).toString("base64url");
}

export function decodeNotificationCursor(cursor?: string): CursorValue | undefined {
  if (!cursor) return undefined;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as CursorValue;
    if (!mongoose.isValidObjectId(parsed.id) || Number.isNaN(new Date(parsed.createdAt).getTime())) return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

function ownedNotificationFilter(userId: string, id?: string): QueryFilter<NotificationDocument> {
  return {
    $and: [
      recipientNotificationFilter(userId),
      ...(id ? [{ _id: id }] : []),
    ],
  } as QueryFilter<NotificationDocument>;
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  return NotificationModel.countDocuments(unreadNotificationFilter(userId));
}

export function emitUnreadNotificationCount(userId: string, count: number): void {
  emitToUser(userId, SOCKET_EVENTS.NOTIFICATIONS_UNREAD_COUNT, { count });
}

export async function listNotifications(
  userId: string,
  options: NotificationListOptions = {}
): Promise<NotificationListResult> {
  const limit = Math.min(Math.max(Math.trunc(options.limit || DEFAULT_LIMIT), 1), MAX_LIMIT);
  const cursor = decodeNotificationCursor(options.cursor);
  const filters: QueryFilter<NotificationDocument>[] = [recipientNotificationFilter(userId)];

  if (options.read === "read") filters.push(readStateNotificationFilter(true));
  if (options.read === "unread") filters.push(readStateNotificationFilter(false));
  if (cursor) {
    const createdAt = new Date(cursor.createdAt);
    filters.push({
      $or: [
        { createdAt: { $lt: createdAt } },
        { createdAt, _id: { $lt: new mongoose.Types.ObjectId(cursor.id) } },
      ],
    });
  }

  const [documents, unreadCount] = await Promise.all([
    NotificationModel.find({ $and: filters }).sort({ createdAt: -1, _id: -1 }).limit(limit + 1),
    getUnreadNotificationCount(userId),
  ]);
  const hasMore = documents.length > limit;
  const pageDocuments = hasMore ? documents.slice(0, limit) : documents;
  const last = pageDocuments.at(-1);

  return {
    items: pageDocuments.map(serializeNotification),
    pageInfo: {
      hasMore,
      ...(hasMore && last ? { nextCursor: encodeCursor(last) } : {}),
    },
    unreadCount,
  };
}

async function emitCreatedNotifications(userId: string, payloads: NotificationPayload[]) {
  payloads.forEach((payload) => emitToUser(userId, SOCKET_EVENTS.NOTIFICATION_NEW, payload));
  emitUnreadNotificationCount(userId, await getUnreadNotificationCount(userId));
}

export async function createNotification(input: CreateNotificationInput) {
  const [payload] = await createNotifications([input]);
  return payload;
}

export async function createNotifications(
  inputs: readonly CreateNotificationInput[]
): Promise<NotificationPayload[]> {
  if (!inputs.length) return [];

  // A batch can be assembled from overlapping role/project audiences. Collapse
  // identical deliveries before persistence while keeping separate events intact.
  const normalizedInputs = inputs.map((input) => ({
    ...input,
    dedupeKey: input.dedupeKey || (input.entityId ? `${input.type}:${input.projectId || ""}:${input.entityId}` : undefined),
  }));
  const uniqueInputs = Array.from(new Map(normalizedInputs.map((input) => [
    input.dedupeKey
      ? [input.userId, input.dedupeKey].join("\u0000")
      : [input.userId, input.type, input.projectId, input.title, input.message].join("\u0000"),
    input,
  ])).values());

  const idempotentInputs = uniqueInputs.filter((input) => input.dedupeKey);
  const existing = idempotentInputs.length
    ? await NotificationModel.find({
        $or: idempotentInputs.map((input) => ({ userId: input.userId, dedupeKey: input.dedupeKey })),
      })
    : [];
  const existingKeys = new Set(existing.map((document) => `${document.userId}:${document.dedupeKey}`));
  const newInputs = uniqueInputs.filter((input) => !input.dedupeKey || !existingKeys.has(`${input.userId}:${input.dedupeKey}`));

  const documents = newInputs.length
    ? await NotificationModel.insertMany(
        newInputs.map((input) => ({ ...input, userId: input.userId, isRead: false, seen: false, status: "sent" })),
        { ordered: true }
      )
    : [];
  const payloads = documents.map(serializeNotification);
  const byUser = new Map<string, NotificationPayload[]>();
  payloads.forEach((payload) => byUser.set(payload.userId, [...(byUser.get(payload.userId) || []), payload]));
  await Promise.all(Array.from(byUser, ([userId, userPayloads]) => emitCreatedNotifications(userId, userPayloads)));
  return [...existing.map(serializeNotification), ...payloads];
}

export async function markNotificationReadForUser(userId: string, id: string) {
  if (!mongoose.isValidObjectId(id)) return null;
  const notification = await NotificationModel.findOneAndUpdate(
    ownedNotificationFilter(userId, id),
    { $set: { isRead: true, seen: true, seenAt: new Date(), status: "seen" } },
    { new: true }
  );
  if (!notification) return null;

  emitToUser(userId, SOCKET_EVENTS.NOTIFICATION_READ, { id, isRead: true });
  emitUnreadNotificationCount(userId, await getUnreadNotificationCount(userId));
  return serializeNotification(notification);
}

export async function markAllNotificationsReadForUser(userId: string) {
  const result = await NotificationModel.updateMany(
    { $and: [recipientNotificationFilter(userId), readStateNotificationFilter(false)] },
    { $set: { isRead: true, seen: true, seenAt: new Date(), status: "seen" } }
  );
  emitToUser(userId, SOCKET_EVENTS.NOTIFICATIONS_READ_ALL, { isRead: true });
  emitUnreadNotificationCount(userId, await getUnreadNotificationCount(userId));
  return result.modifiedCount;
}

export async function deleteNotificationForUser(userId: string, id: string) {
  if (!mongoose.isValidObjectId(id)) return false;
  const notification = await NotificationModel.findOneAndDelete(ownedNotificationFilter(userId, id));
  if (!notification) return false;
  emitToUser(userId, SOCKET_EVENTS.NOTIFICATION_DELETED, { id });
  emitUnreadNotificationCount(userId, await getUnreadNotificationCount(userId));
  return true;
}
