import type { RequestHandler } from "express";
import { AuditLogModel } from "../models/auditLog.model";
import { sendSuccess } from "@/utils/response";

export const getAuditLogs: RequestHandler = async (_req, res, next) => {
  try {
    const logs = await AuditLogModel.find().sort({ createdAt: -1 }).limit(200);

    sendSuccess(
      res,
      logs.map((log) => ({
        id: log._id.toString(),
        actorId: log.actorId ? String(log.actorId) : undefined,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        ip: log.ip,
        userAgent: log.userAgent,
        metadata: log.metadata,
        createdAt: log.createdAt,
      }))
    );
  } catch (error) {
    next(error);
  }
};
