import type { RequestHandler } from "express";
import { sendSuccess } from "@/utils/response";
import {
  getAuditLog,
  listAuditLogs,
  type AuditLogQuery,
} from "../services/auditQuery.service";

export const getAuditLogs: RequestHandler = async (req, res, next) => {
  try {
    sendSuccess(
      res,
      await listAuditLogs(req.query as unknown as AuditLogQuery)
    );
  } catch (error) {
    next(error);
  }
};

export const getAuditLogDetails: RequestHandler = async (req, res, next) => {
  try {
    sendSuccess(res, await getAuditLog(String(req.params.id)));
  } catch (error) {
    next(error);
  }
};
