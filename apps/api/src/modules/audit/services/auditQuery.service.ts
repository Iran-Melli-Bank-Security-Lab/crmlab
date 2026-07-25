import mongoose, { type QueryFilter } from "mongoose";
import { HTTP_STATUS } from "@/constants/http";
import { AppError } from "@/utils/AppError";
import { ProjectModel } from "@/modules/projects/models/project.model";
import { UserModel } from "@/modules/users/models/user.model";
import {
  AuditLogModel,
  type AuditLogDocument,
} from "../models/auditLog.model";
import { auditModuleFromAction } from "./audit.service";

export type AuditLogQuery = {
  page: number;
  pageSize: number;
  search?: string;
  user?: string;
  action?: string;
  module?: string;
  project?: string;
  ip?: string;
  status?: "success" | "failure";
  from?: string;
  to?: string;
  sortBy?: "createdAt" | "action" | "module" | "entityType" | "ip" | "status";
  sortOrder?: "asc" | "desc";
};

export const AUDIT_LOG_SORT = {
  createdAt: -1,
  _id: -1,
} as const;

type AuditRow = AuditLogDocument & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function safeRegex(value: string) {
  return new RegExp(escapeRegExp(value.trim()), "i");
}

export function redactAuditValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactAuditValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      /password|token|secret|authorization|cookie|credential/i.test(key)
        ? "[REDACTED]"
        : redactAuditValue(item),
    ])
  );
}

function legacyStatusFilter(status: "success" | "failure"): QueryFilter<AuditLogDocument> {
  if (status === "failure") {
    return {
      $or: [
        { status: "failure" },
        { "metadata.status": { $in: ["failure", "failed", "error"] } },
        { "metadata.success": false },
      ],
    };
  }
  return {
    $or: [
      { status: "success" },
      { "metadata.status": "success" },
      { "metadata.success": true },
      {
        status: { $exists: false },
        "metadata.status": { $exists: false },
        "metadata.success": { $ne: false },
      },
    ],
  };
}

async function matchingUserIds(value: string) {
  if (mongoose.isValidObjectId(value)) return [new mongoose.Types.ObjectId(value)];
  const regex = safeRegex(value);
  const users = await UserModel.find({
    $or: [{ username: regex }, { firstName: regex }, { lastName: regex }],
  }).select("_id").limit(100).lean();
  return users.map((user) => user._id);
}

async function matchingProjectIds(value: string) {
  if (mongoose.isValidObjectId(value)) return [new mongoose.Types.ObjectId(value)];
  const regex = safeRegex(value);
  const projects = await ProjectModel.find({ projectName: regex })
    .select("_id")
    .limit(100)
    .lean();
  return projects.map((project) => project._id);
}

export async function buildAuditLogFilter(query: AuditLogQuery) {
  const filters: QueryFilter<AuditLogDocument>[] = [];
  if (query.user) {
    const ids = await matchingUserIds(query.user);
    filters.push({ actorId: { $in: ids } });
  }
  if (query.action) filters.push({ action: safeRegex(query.action) });
  if (query.module) {
    const regex = safeRegex(query.module);
    const actionPrefix = new RegExp(`^${escapeRegExp(query.module.trim())}\\.`, "i");
    filters.push({
      $or: [{ module: regex }, { action: actionPrefix }, { entityType: regex }],
    });
  }
  if (query.project) {
    const ids = await matchingProjectIds(query.project);
    const rawIds = ids.map(String);
    filters.push({
      $or: [
        { projectId: { $in: ids } },
        { "metadata.projectId": { $in: [...ids, ...rawIds] } },
        { entityType: "project", entityId: { $in: rawIds } },
      ],
    });
  }
  if (query.ip) filters.push({ ip: safeRegex(query.ip) });
  if (query.status) filters.push(legacyStatusFilter(query.status));
  if (query.from || query.to) {
    const createdAt: { $gte?: Date; $lte?: Date } = {};
    if (query.from) createdAt.$gte = new Date(query.from);
    if (query.to) {
      const to = new Date(query.to);
      if (/^\d{4}-\d{2}-\d{2}$/.test(query.to)) to.setHours(23, 59, 59, 999);
      createdAt.$lte = to;
    }
    filters.push({ createdAt });
  }
  if (query.search) {
    const regex = safeRegex(query.search);
    const [userIds, projectIds] = await Promise.all([
      matchingUserIds(query.search),
      matchingProjectIds(query.search),
    ]);
    filters.push({
      $or: [
        { action: regex },
        { module: regex },
        { entityType: regex },
        { entityId: regex },
        { ip: regex },
        { userAgent: regex },
        { actorId: { $in: userIds } },
        { projectId: { $in: projectIds } },
      ],
    });
  }
  return filters.length ? { $and: filters } : {};
}

function statusOf(row: AuditRow) {
  const metadata = (row.metadata || {}) as Record<string, unknown>;
  if (row.status) return row.status;
  if (metadata.success === false) return "failure";
  return ["failure", "failed", "error"].includes(
    String(metadata.status || "").toLowerCase()
  ) ? "failure" : "success";
}

async function serializeRows(rows: AuditRow[]) {
  const actorIds = [...new Set(rows.flatMap((row) => row.actorId ? [String(row.actorId)] : []))];
  const projectIds = [...new Set(rows.flatMap((row) => {
    const metadata = (row.metadata || {}) as Record<string, unknown>;
    const id = row.projectId || metadata.projectId ||
      (row.entityType === "project" ? row.entityId : undefined);
    return id && mongoose.isValidObjectId(String(id)) ? [String(id)] : [];
  }))];
  const [users, projects] = await Promise.all([
    UserModel.find({ _id: { $in: actorIds } }).select("firstName lastName username").lean(),
    ProjectModel.find({ _id: { $in: projectIds } }).select("projectName").lean(),
  ]);
  const usersById = new Map(users.map((user) => [String(user._id), user]));
  const projectsById = new Map(projects.map((project) => [String(project._id), project]));

  return rows.map((row) => {
    const metadata = (row.metadata || {}) as Record<string, unknown>;
    const actor = row.actorId ? usersById.get(String(row.actorId)) : undefined;
    const projectId = row.projectId || metadata.projectId ||
      (row.entityType === "project" ? row.entityId : undefined);
    const project = projectId ? projectsById.get(String(projectId)) : undefined;
    return {
      id: row._id.toString(),
      actor: actor ? {
        id: String(actor._id),
        name: `${actor.firstName} ${actor.lastName}`.trim(),
        username: actor.username,
      } : row.actorId ? { id: String(row.actorId), name: "Unknown user" } : undefined,
      action: row.action,
      module: row.module || auditModuleFromAction(row.action),
      resource: { type: row.entityType, id: row.entityId },
      project: project ? {
        id: String(project._id),
        name: project.projectName,
      } : projectId ? { id: String(projectId) } : undefined,
      status: statusOf(row),
      ip: row.ip,
      userAgent: row.userAgent,
      previousValue: redactAuditValue(
        row.previousValue ?? metadata.previousValue ?? metadata.previous ?? metadata.before
      ),
      newValue: redactAuditValue(
        row.newValue ?? metadata.newValue ?? metadata.new ?? metadata.after
      ),
      metadata: redactAuditValue(metadata),
      createdAt: row.createdAt,
    };
  });
}

export async function listAuditLogs(query: AuditLogQuery) {
  if (query.from && query.to && new Date(query.from) > new Date(query.to)) {
    throw new AppError(
      "Audit log start date must not be after the end date",
      HTTP_STATUS.BAD_REQUEST
    );
  }
  const filter = await buildAuditLogFilter(query);
  const [rows, total] = await Promise.all([
    AuditLogModel.find(filter)
      // Sort before skip/limit so every page is part of one stable,
      // newest-first sequence. _id resolves ties at the same timestamp.
      .sort(AUDIT_LOG_SORT)
      .skip((query.page - 1) * query.pageSize)
      .limit(query.pageSize),
    AuditLogModel.countDocuments(filter),
  ]);
  return {
    items: await serializeRows(rows as AuditRow[]),
    pageInfo: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    },
    policy: {
      mode: "read-only",
      canDelete: false,
      retentionDays: null,
    },
  };
}

export async function getAuditLog(id: string) {
  const row = await AuditLogModel.findById(id);
  if (!row) throw new AppError("Audit log not found", HTTP_STATUS.NOT_FOUND);
  const [serialized] = await serializeRows([row as AuditRow]);
  return serialized;
}
