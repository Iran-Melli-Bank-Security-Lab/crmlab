import type { RequestHandler } from "express";
import type { Types } from "mongoose";
import { HTTP_STATUS } from "@/constants/http";
import { PERMISSIONS } from "@/constants/permissions";
import { UserModel } from "@/modules/users/models/user.model";
import { AppError } from "@/utils/AppError";
import { sendSuccess } from "@/utils/response";
import { DevOpsCredentialGroupModel } from "../models/devOpsCredentialGroup.model";
import { RuntimeInstanceModel, TestTargetModel } from "../models/devOpsResource.model";
import { ProjectDevOpsInfoModel } from "../models/projectDevOpsInfo.model";
import { ensureProjectDevOpsInfo } from "../services/projectDevOpsInfo.service";
import {
  credentialGroupCreateRequestSchema,
  credentialGroupPatchRequestSchema,
  type CredentialGroupCreateRequest,
  type CredentialGroupPatchRequest,
} from "../validators/devOpsCredentialGroup.validators";

function actor(req: Parameters<RequestHandler>[0]) {
  if (!req.user) throw new AppError("Unauthorized", HTTP_STATUS.UNAUTHORIZED);
  return req.user;
}

async function validateLinks(
  projectId: string,
  devOpsInfoId: Types.ObjectId | string,
  input: CredentialGroupCreateRequest | CredentialGroupPatchRequest
) {
  const targetIds = input.targetIds || [];
  const instanceIds = input.instanceIds || [];
  const userIds = input.visibleToUserIds || [];
  const [targetCount, instanceCount, userCount] = await Promise.all([
    TestTargetModel.countDocuments({ _id: { $in: targetIds }, projectId, devOpsInfoId }),
    RuntimeInstanceModel.countDocuments({ _id: { $in: instanceIds }, projectId, devOpsInfoId }),
    UserModel.countDocuments({ _id: { $in: userIds } }),
  ]);
  if (targetCount !== new Set(targetIds).size) throw new AppError("One or more targets do not belong to this project", HTTP_STATUS.BAD_REQUEST);
  if (instanceCount !== new Set(instanceIds).size) throw new AppError("One or more instances do not belong to this project", HTTP_STATUS.BAD_REQUEST);
  if (userCount !== new Set(userIds).size) throw new AppError("One or more visible users do not exist", HTTP_STATUS.BAD_REQUEST);
}

export const listCredentialGroups: RequestHandler = async (req, res, next) => {
  try {
    const user = actor(req);
    const projectId = String(req.params.id);
    const info = await ProjectDevOpsInfoModel.findOne({ projectId });
    if (!info) return sendSuccess(res, []);
    const canReadAll = user.permissions.includes(PERMISSIONS.DEVOPS_PROJECTS_READ) || user.permissions.includes(PERMISSIONS.ADMIN_SYSTEM_MANAGE);
    const records = await DevOpsCredentialGroupModel.find({
      projectId,
      devOpsInfoId: info._id,
      ...(canReadAll ? {} : { visibleToUserIds: user.id }),
    }).sort({ createdAt: 1 });
    return sendSuccess(res, records);
  } catch (error) { next(error); }
};

export const createCredentialGroup: RequestHandler = async (req, res, next) => {
  try {
    const user = actor(req);
    const projectId = String(req.params.id);
    const input = credentialGroupCreateRequestSchema.parse(req.body);
    const info = await ensureProjectDevOpsInfo(projectId, user.id);
    const visibleToUserIds = input.scope === "shared_for_all_users"
      ? [...new Set((req.project?.assignedUserIds || []).map(String))]
      : input.visibleToUserIds;
    await validateLinks(projectId, info._id, { ...input, visibleToUserIds });
    const record = await DevOpsCredentialGroupModel.create({
      projectId, devOpsInfoId: info._id, name: input.name, type: input.type, scope: input.scope,
      targetIds: input.targetIds, instanceIds: input.instanceIds, visibleToUserIds,
      accounts: input.accounts.map(({ label, role, username, password, token, notes }) => ({ label, role, username, password, token, notes })),
      createdBy: user.id, updatedBy: user.id,
    });
    return sendSuccess(res, record, HTTP_STATUS.CREATED);
  } catch (error) { next(error); }
};

export const patchCredentialGroup: RequestHandler = async (req, res, next) => {
  try {
    const user = actor(req);
    const projectId = String(req.params.id);
    const input = credentialGroupPatchRequestSchema.parse(req.body);
    const info = await ProjectDevOpsInfoModel.findOne({ projectId });
    if (!info) throw new AppError("DevOps info not found", HTTP_STATUS.NOT_FOUND);
    const record = await DevOpsCredentialGroupModel.findOne({ _id: req.params.groupId, projectId, devOpsInfoId: info._id });
    if (!record) throw new AppError("Credential group not found", HTTP_STATUS.NOT_FOUND);
    const nextScope = input.scope || record.scope;
    const visibleToUserIds = nextScope === "shared_for_all_users"
      ? [...new Set((req.project?.assignedUserIds || []).map(String))]
      : input.visibleToUserIds;
    await validateLinks(projectId, info._id, { ...input, ...(visibleToUserIds ? { visibleToUserIds } : {}) });
    for (const key of ["name", "type", "scope", "targetIds", "instanceIds", "visibleToUserIds", "accounts"] as const) {
      const value = key === "visibleToUserIds" && nextScope === "shared_for_all_users" ? visibleToUserIds : input[key];
      if (value !== undefined) record.set(key, value);
    }
    record.updatedBy = user.id as never;
    await record.save();
    return sendSuccess(res, record);
  } catch (error) { next(error); }
};

export const deleteCredentialGroup: RequestHandler = async (req, res, next) => {
  try {
    const projectId = String(req.params.id);
    const info = await ProjectDevOpsInfoModel.findOne({ projectId });
    if (!info) throw new AppError("DevOps info not found", HTTP_STATUS.NOT_FOUND);
    const record = await DevOpsCredentialGroupModel.findOneAndDelete({ _id: req.params.groupId, projectId, devOpsInfoId: info._id });
    if (!record) throw new AppError("Credential group not found", HTTP_STATUS.NOT_FOUND);
    // TODO: invoke project credential cleanup from the project-close lifecycle when that workflow exists.
    return sendSuccess(res, { id: String(record._id) });
  } catch (error) { next(error); }
};
