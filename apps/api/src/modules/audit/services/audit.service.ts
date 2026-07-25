import type { Request } from "express";
import mongoose from "mongoose";
import type { AuditAction, AuditEntityType } from "@/constants/audit";
import { AuditLogModel } from "../models/auditLog.model";

type AuditInput = {
  req?: Request;
  actorId?: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string;
  metadata?: Record<string, unknown>;
  status?: "success" | "failure";
  previousValue?: unknown;
  newValue?: unknown;
};

export function auditModuleFromAction(action: string) {
  return action.split(".")[0] || "system";
}

function auditStatus(input: AuditInput) {
  if (input.status) return input.status;
  if (input.metadata?.success === false) return "failure";
  const status = String(input.metadata?.status || "").toLowerCase();
  return ["failure", "failed", "error"].includes(status) ? "failure" : "success";
}

export async function writeAuditLog(input: AuditInput) {
  try {
    const metadata = input.metadata || {};
    const rawProjectId =
      metadata.projectId ||
      (input.entityType === "project" ? input.entityId : undefined);
    const projectId = rawProjectId && mongoose.isValidObjectId(String(rawProjectId))
      ? String(rawProjectId)
      : undefined;
    await AuditLogModel.create({
      actorId: input.actorId || input.req?.user?.id,
      action: input.action,
      module: auditModuleFromAction(input.action),
      entityType: input.entityType,
      entityId: input.entityId,
      projectId,
      status: auditStatus(input),
      ip: input.req?.ip,
      userAgent: input.req?.get("user-agent"),
      previousValue:
        input.previousValue ?? metadata.previousValue ?? metadata.previous ?? metadata.before,
      newValue: input.newValue ?? metadata.newValue ?? metadata.new ?? metadata.after,
      metadata,
    });
  } catch (error) {
    console.error("Failed to write audit log", error);
  }
}
