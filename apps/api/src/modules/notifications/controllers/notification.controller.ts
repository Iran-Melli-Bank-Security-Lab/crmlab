import type { RequestHandler } from "express";
import mongoose from "mongoose";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "@/constants/audit";
import { HTTP_STATUS } from "@/constants/http";
import { SOCKET_EVENTS } from "@/constants/socket";
import { writeAuditLog } from "@/modules/audit/services/audit.service";
import { emitToUser } from "@/realtime/socket.delivery";
import { AppError } from "@/utils/AppError";
import { sendSuccess } from "@/utils/response";
import { NotificationModel } from "../models/notification.model";
import { serializeNotification } from "../services/notification.service";

export const getNotifications: RequestHandler = async (req, res, next) => {
  try {
    const notifications = await NotificationModel.find({ userId: req.user!.id })
      .sort({ createdAt: -1 })
      .limit(50);

    sendSuccess(
      res,
      notifications.map(serializeNotification)
    );
  } catch (error) {
    next(error);
  }
};

export const markAsRead: RequestHandler = async (req, res, next) => {
  try {
    const notificationId = String(req.params.id);
    if (!mongoose.isValidObjectId(notificationId)) {
      throw new AppError("Notification not found", HTTP_STATUS.NOT_FOUND);
    }

    const notification = await NotificationModel.findOneAndUpdate(
      { _id: notificationId, userId: req.user!.id },
      { isRead: true },
      { new: true }
    );
    if (!notification) {
      throw new AppError("Notification not found", HTTP_STATUS.NOT_FOUND);
    }
    await writeAuditLog({
      req,
      action: AUDIT_ACTIONS.NOTIFICATION_MARK_READ,
      entityType: AUDIT_ENTITY_TYPES.NOTIFICATION,
      entityId: notificationId,
    });
    emitToUser(req.user!.id, SOCKET_EVENTS.NOTIFICATION_READ, {
      id: notificationId,
      isRead: true,
    });
    sendSuccess(res, { id: notificationId, isRead: true });
  } catch (error) {
    next(error);
  }
};

export const deleteNotification: RequestHandler = async (req, res, next) => {
  try {
    const notificationId = String(req.params.id);
    if (!mongoose.isValidObjectId(notificationId)) {
      throw new AppError("Notification not found", HTTP_STATUS.NOT_FOUND);
    }

    const notification = await NotificationModel.findOneAndDelete({
      _id: notificationId,
      userId: req.user!.id,
    });

    if (!notification) {
      throw new AppError("Notification not found", HTTP_STATUS.NOT_FOUND);
    }

    await writeAuditLog({
      req,
      action: AUDIT_ACTIONS.NOTIFICATION_DELETE,
      entityType: AUDIT_ENTITY_TYPES.NOTIFICATION,
      entityId: notificationId,
    });

    emitToUser(req.user!.id, SOCKET_EVENTS.NOTIFICATION_DELETED, { id: notificationId });
    sendSuccess(res, { id: notificationId, deleted: true });
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead: RequestHandler = async (req, res, next) => {
  try {
    await NotificationModel.updateMany({ userId: req.user!.id, isRead: false }, { isRead: true });
    await writeAuditLog({
      req,
      action: AUDIT_ACTIONS.NOTIFICATION_MARK_ALL_READ,
      entityType: AUDIT_ENTITY_TYPES.NOTIFICATION,
      metadata: { userId: req.user!.id },
    });
    emitToUser(req.user!.id, SOCKET_EVENTS.NOTIFICATIONS_READ_ALL, {
      isRead: true,
    });
    sendSuccess(res, { isRead: true });
  } catch (error) {
    next(error);
  }
};
