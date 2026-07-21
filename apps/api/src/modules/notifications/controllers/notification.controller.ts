import type { RequestHandler } from "express";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "@/constants/audit";
import { HTTP_STATUS } from "@/constants/http";
import { writeAuditLog } from "@/modules/audit/services/audit.service";
import { AppError } from "@/utils/AppError";
import { sendSuccess } from "@/utils/response";
import {
  deleteNotificationForUser,
  listNotifications,
  markAllNotificationsReadForUser,
  markNotificationReadForUser,
  type NotificationReadFilter,
} from "../services/notification.service";

function readFilter(value: unknown): NotificationReadFilter {
  return value === "read" || value === "unread" ? value : "all";
}

export const getNotifications: RequestHandler = async (req, res, next) => {
  try {
    const result = await listNotifications(req.user!.id, {
      cursor: typeof req.query.cursor === "string" ? req.query.cursor : undefined,
      limit: typeof req.query.limit === "string" ? Number(req.query.limit) : undefined,
      read: readFilter(req.query.read),
    });
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const markAsRead: RequestHandler = async (req, res, next) => {
  try {
    const notificationId = String(req.params.id);
    const notification = await markNotificationReadForUser(req.user!.id, notificationId);
    if (!notification) throw new AppError("Notification not found", HTTP_STATUS.NOT_FOUND);
    await writeAuditLog({ req, action: AUDIT_ACTIONS.NOTIFICATION_MARK_READ, entityType: AUDIT_ENTITY_TYPES.NOTIFICATION, entityId: notificationId });
    sendSuccess(res, { id: notificationId, isRead: true });
  } catch (error) {
    next(error);
  }
};

export const deleteNotification: RequestHandler = async (req, res, next) => {
  try {
    const notificationId = String(req.params.id);
    if (!(await deleteNotificationForUser(req.user!.id, notificationId))) {
      throw new AppError("Notification not found", HTTP_STATUS.NOT_FOUND);
    }
    await writeAuditLog({ req, action: AUDIT_ACTIONS.NOTIFICATION_DELETE, entityType: AUDIT_ENTITY_TYPES.NOTIFICATION, entityId: notificationId });
    sendSuccess(res, { id: notificationId, deleted: true });
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead: RequestHandler = async (req, res, next) => {
  try {
    const modifiedCount = await markAllNotificationsReadForUser(req.user!.id);
    await writeAuditLog({ req, action: AUDIT_ACTIONS.NOTIFICATION_MARK_ALL_READ, entityType: AUDIT_ENTITY_TYPES.NOTIFICATION, metadata: { userId: req.user!.id, modifiedCount } });
    sendSuccess(res, { isRead: true, modifiedCount });
  } catch (error) {
    next(error);
  }
};
