import type { RequestHandler } from "express";
import type { Types } from "mongoose";
import { HTTP_STATUS } from "@/constants/http";
import { UserModel } from "@/modules/users/models/user.model";
import { AppError } from "@/utils/AppError";
import { sendSuccess } from "@/utils/response";
import { RuntimeInstanceModel, TestTargetModel } from "../models/devOpsResource.model";
import { ProjectDevOpsInfoModel } from "../models/projectDevOpsInfo.model";
import { ensureProjectDevOpsInfo, recomputeProjectDevOpsCompletion } from "../services/projectDevOpsInfo.service";
import {
  runtimeInstanceCreateRequestSchema,
  runtimeInstancePatchRequestSchema,
  testTargetCreateRequestSchema,
  testTargetPatchRequestSchema,
} from "../validators/devOpsResource.validators";

function requireActor(req: Parameters<RequestHandler>[0]) {
  if (!req.user) throw new AppError("Unauthorized", HTTP_STATUS.UNAUTHORIZED);
  return req.user.id;
}

async function getInfo(projectId: string) {
  return ProjectDevOpsInfoModel.findOne({ projectId });
}

async function validateUser(userId?: string | null) {
  if (userId && !(await UserModel.exists({ _id: userId }))) {
    throw new AppError("Assigned user not found", HTTP_STATUS.BAD_REQUEST);
  }
}

async function validateInstanceLink(
  projectId: string,
  devOpsInfoId: Types.ObjectId | string,
  instanceId?: string | null
) {
  if (!instanceId) return;
  const exists = await RuntimeInstanceModel.exists({ _id: instanceId, projectId, devOpsInfoId });
  if (!exists) throw new AppError("Runtime instance not found for this project", HTTP_STATUS.BAD_REQUEST);
}

export const listRuntimeInstances: RequestHandler = async (req, res, next) => {
  try {
    const projectId = String(req.params.id);
    const info = await getInfo(projectId);
    if (!info) return sendSuccess(res, []);
    const records = await RuntimeInstanceModel.find({ projectId, devOpsInfoId: info._id }).sort({ createdAt: 1 });
    return sendSuccess(res, records);
  } catch (error) { next(error); }
};

export const createRuntimeInstance: RequestHandler = async (req, res, next) => {
  try {
    const actor = requireActor(req);
    const projectId = String(req.params.id);
    const input = runtimeInstanceCreateRequestSchema.parse(req.body);
    await validateUser(input.assignedUserId);
    const info = await ensureProjectDevOpsInfo(projectId, actor);
    const record = await RuntimeInstanceModel.create({
      devOpsInfoId: info._id, projectId, assignedUserId: input.assignedUserId ?? null,
      name: input.name, type: input.type, status: input.status, accessUrl: input.accessUrl,
      consoleUrl: input.consoleUrl, host: input.host, port: input.port ?? null,
      networkNotes: input.networkNotes, notes: input.notes, createdBy: actor, updatedBy: actor,
    });
    await recomputeProjectDevOpsCompletion(info, actor);
    return sendSuccess(res, record, HTTP_STATUS.CREATED);
  } catch (error) { next(error); }
};

export const patchRuntimeInstance: RequestHandler = async (req, res, next) => {
  try {
    const actor = requireActor(req);
    const projectId = String(req.params.id);
    const input = runtimeInstancePatchRequestSchema.parse(req.body);
    await validateUser(input.assignedUserId);
    const info = await getInfo(projectId);
    if (!info) throw new AppError("DevOps info not found", HTTP_STATUS.NOT_FOUND);
    const record = await RuntimeInstanceModel.findOne({ _id: req.params.instanceId, projectId, devOpsInfoId: info._id });
    if (!record) throw new AppError("Runtime instance not found", HTTP_STATUS.NOT_FOUND);
    for (const key of ["assignedUserId", "name", "type", "status", "accessUrl", "consoleUrl", "host", "port", "networkNotes", "notes"] as const) {
      if (key in input) record.set(key, input[key] ?? null);
    }
    record.updatedBy = actor as never;
    await record.save();
    await recomputeProjectDevOpsCompletion(info, actor);
    return sendSuccess(res, record);
  } catch (error) { next(error); }
};

export const deleteRuntimeInstance: RequestHandler = async (req, res, next) => {
  try {
    const actor = requireActor(req);
    const projectId = String(req.params.id);
    const info = await getInfo(projectId);
    if (!info) throw new AppError("DevOps info not found", HTTP_STATUS.NOT_FOUND);
    const instance = await RuntimeInstanceModel.findOne({ _id: req.params.instanceId, projectId, devOpsInfoId: info._id });
    if (!instance) throw new AppError("Runtime instance not found", HTTP_STATUS.NOT_FOUND);
    if (await TestTargetModel.exists({ projectId, devOpsInfoId: info._id, runtimeInstanceId: instance._id })) {
      throw new AppError("Remove linked test targets before deleting this instance", HTTP_STATUS.CONFLICT);
    }
    await instance.deleteOne();
    await recomputeProjectDevOpsCompletion(info, actor);
    return sendSuccess(res, { id: String(instance._id) });
  } catch (error) { next(error); }
};

export const listTestTargets: RequestHandler = async (req, res, next) => {
  try {
    const projectId = String(req.params.id);
    const info = await getInfo(projectId);
    if (!info) return sendSuccess(res, []);
    const records = await TestTargetModel.find({ projectId, devOpsInfoId: info._id }).sort({ createdAt: 1 });
    return sendSuccess(res, records);
  } catch (error) { next(error); }
};

export const createTestTarget: RequestHandler = async (req, res, next) => {
  try {
    const actor = requireActor(req);
    const projectId = String(req.params.id);
    const input = testTargetCreateRequestSchema.parse(req.body);
    const info = await ensureProjectDevOpsInfo(projectId, actor);
    await validateInstanceLink(projectId, info._id, input.runtimeInstanceId);
    const record = await TestTargetModel.create({
      devOpsInfoId: info._id, projectId, runtimeInstanceId: input.runtimeInstanceId ?? null,
      name: input.name, type: input.type, url: input.url, version: input.version,
      authRequired: input.authRequired, notes: input.notes, createdBy: actor, updatedBy: actor,
    });
    await recomputeProjectDevOpsCompletion(info, actor);
    return sendSuccess(res, record, HTTP_STATUS.CREATED);
  } catch (error) { next(error); }
};

export const patchTestTarget: RequestHandler = async (req, res, next) => {
  try {
    const actor = requireActor(req);
    const projectId = String(req.params.id);
    const input = testTargetPatchRequestSchema.parse(req.body);
    const info = await getInfo(projectId);
    if (!info) throw new AppError("DevOps info not found", HTTP_STATUS.NOT_FOUND);
    await validateInstanceLink(projectId, info._id, input.runtimeInstanceId);
    const record = await TestTargetModel.findOne({ _id: req.params.targetId, projectId, devOpsInfoId: info._id });
    if (!record) throw new AppError("Test target not found", HTTP_STATUS.NOT_FOUND);
    for (const key of ["runtimeInstanceId", "name", "type", "url", "version", "authRequired", "notes"] as const) {
      if (key in input) record.set(key, input[key] ?? null);
    }
    record.updatedBy = actor as never;
    await record.save();
    await recomputeProjectDevOpsCompletion(info, actor);
    return sendSuccess(res, record);
  } catch (error) { next(error); }
};

export const deleteTestTarget: RequestHandler = async (req, res, next) => {
  try {
    const actor = requireActor(req);
    const projectId = String(req.params.id);
    const info = await getInfo(projectId);
    if (!info) throw new AppError("DevOps info not found", HTTP_STATUS.NOT_FOUND);
    const record = await TestTargetModel.findOneAndDelete({ _id: req.params.targetId, projectId, devOpsInfoId: info._id });
    if (!record) throw new AppError("Test target not found", HTTP_STATUS.NOT_FOUND);
    await recomputeProjectDevOpsCompletion(info, actor);
    return sendSuccess(res, { id: String(record._id) });
  } catch (error) { next(error); }
};
