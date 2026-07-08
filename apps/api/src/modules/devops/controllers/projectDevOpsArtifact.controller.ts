import type { RequestHandler } from "express";
import { HTTP_STATUS } from "@/constants/http";
import { AppError } from "@/utils/AppError";
import { sendSuccess } from "@/utils/response";
import { ProjectDevOpsArtifactModel } from "../models/projectDevOpsArtifact.model";
import { DELIVERY_MODE_TO_SETUP_TYPE, ProjectDevOpsInfoModel } from "../models/projectDevOpsInfo.model";
import { ensureProjectDevOpsInfo, recomputeProjectDevOpsCompletion } from "../services/projectDevOpsInfo.service";
import { mobileArtifactCreateRequestSchema, mobileArtifactPatchRequestSchema } from "../validators/projectDevOpsArtifact.validators";

function requireActor(req: Parameters<RequestHandler>[0]) {
  if (!req.user) throw new AppError("Unauthorized", HTTP_STATUS.UNAUTHORIZED);
  return req.user.id;
}
function isMobileProject(req: Parameters<RequestHandler>[0]) {
  return (req.project?.platform || []).some((value) => String(value).toLowerCase().includes("mobile"));
}
async function requireMobileInfo(projectId: string, actor: string, allowCreate: boolean, req: Parameters<RequestHandler>[0]) {
  const info = allowCreate
    ? await ensureProjectDevOpsInfo(projectId, actor)
    : await ProjectDevOpsInfoModel.findOne({ projectId });
  if (!info) throw new AppError("DevOps info not found", HTTP_STATUS.NOT_FOUND);
  const setupType = info.setupType || DELIVERY_MODE_TO_SETUP_TYPE[info.deliveryMode];
  if (setupType === "none" && (allowCreate || isMobileProject(req))) {
    info.setupType = "mobile_app";
    info.deliveryMode = "mobile_files";
    info.updatedBy = actor as never;
    info.version += 1;
    await info.save();
  } else if (setupType !== "mobile_app") {
    throw new AppError("Mobile artifacts require setupType mobile_app", HTTP_STATUS.BAD_REQUEST);
  }
  return info;
}

export const listMobileArtifacts: RequestHandler = async (req, res, next) => {
  try {
    const projectId = String(req.params.id);
    const info = await ProjectDevOpsInfoModel.findOne({ projectId });
    if (!info) return sendSuccess(res, []);
    return sendSuccess(res, await ProjectDevOpsArtifactModel.find({ projectId, devOpsInfoId: info._id }).sort({ createdAt: 1 }));
  } catch (error) { next(error); }
};
export const createMobileArtifact: RequestHandler = async (req, res, next) => {
  try {
    const actor = requireActor(req);
    const projectId = String(req.params.id);
    const input = mobileArtifactCreateRequestSchema.parse(req.body);
    const info = await requireMobileInfo(projectId, actor, true, req);
    const record = await ProjectDevOpsArtifactModel.create({
      projectId, devOpsInfoId: info._id, setupType: "mobile_app",
      artifactType: input.artifactType, name: input.name, version: input.version,
      platform: input.platform, fileRef: input.fileRef, downloadUrl: input.downloadUrl,
      checksum: input.checksum, buildNumber: input.buildNumber, packageName: input.packageName,
      bundleId: input.bundleId, minOsVersion: input.minOsVersion, deviceNotes: input.deviceNotes,
      installNotes: input.installNotes, createdBy: actor, updatedBy: actor,
    });
    await recomputeProjectDevOpsCompletion(info, actor);
    return sendSuccess(res, record, HTTP_STATUS.CREATED);
  } catch (error) { next(error); }
};
export const patchMobileArtifact: RequestHandler = async (req, res, next) => {
  try {
    const actor = requireActor(req);
    const projectId = String(req.params.id);
    const patch = mobileArtifactPatchRequestSchema.parse(req.body);
    const info = await requireMobileInfo(projectId, actor, false, req);
    const record = await ProjectDevOpsArtifactModel.findOne({ _id: req.params.artifactId, projectId, devOpsInfoId: info._id });
    if (!record) throw new AppError("Mobile artifact not found", HTTP_STATUS.NOT_FOUND);
    const input = mobileArtifactCreateRequestSchema.parse({
      artifactType: patch.artifactType ?? record.artifactType,
      name: patch.name ?? record.name,
      version: patch.version ?? record.version,
      platform: patch.platform ?? record.platform,
      fileRef: patch.fileRef ?? record.fileRef,
      downloadUrl: patch.downloadUrl ?? record.downloadUrl,
      checksum: patch.checksum ?? record.checksum,
      buildNumber: patch.buildNumber ?? record.buildNumber,
      packageName: patch.packageName ?? record.packageName,
      bundleId: patch.bundleId ?? record.bundleId,
      minOsVersion: patch.minOsVersion ?? record.minOsVersion,
      deviceNotes: patch.deviceNotes ?? record.deviceNotes,
      installNotes: patch.installNotes ?? record.installNotes,
    });
    for (const key of ["artifactType", "name", "version", "platform", "fileRef", "downloadUrl", "checksum", "buildNumber", "packageName", "bundleId", "minOsVersion", "deviceNotes", "installNotes"] as const) {
      record.set(key, input[key]);
    }
    record.updatedBy = actor as never;
    await record.save();
    await recomputeProjectDevOpsCompletion(info, actor);
    return sendSuccess(res, record);
  } catch (error) { next(error); }
};
export const deleteMobileArtifact: RequestHandler = async (req, res, next) => {
  try {
    const actor = requireActor(req);
    const projectId = String(req.params.id);
    const info = await requireMobileInfo(projectId, actor, false, req);
    const record = await ProjectDevOpsArtifactModel.findOneAndDelete({ _id: req.params.artifactId, projectId, devOpsInfoId: info._id });
    if (!record) throw new AppError("Mobile artifact not found", HTTP_STATUS.NOT_FOUND);
    await recomputeProjectDevOpsCompletion(info, actor);
    return sendSuccess(res, { id: String(record._id) });
  } catch (error) { next(error); }
};
