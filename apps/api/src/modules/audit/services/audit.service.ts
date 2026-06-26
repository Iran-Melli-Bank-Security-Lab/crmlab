import type { Request } from "express";
import type { AuditAction, AuditEntityType } from "@/constants/audit";
import { AuditLogModel } from "../models/auditLog.model";

type AuditInput = {
  req?: Request;
  actorId?: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string;
  metadata?: Record<string, unknown>;
};

export async function writeAuditLog(input: AuditInput) {
  try {
    await AuditLogModel.create({
      actorId: input.actorId || input.req?.user?.id,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      ip: input.req?.ip,
      userAgent: input.req?.get("user-agent"),
      metadata: input.metadata,
    });
  } catch (error) {
    console.error("Failed to write audit log", error);
  }
}
