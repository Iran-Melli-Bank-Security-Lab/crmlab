import type { RequestHandler } from "express";
import { HTTP_STATUS } from "@/constants/http";
import { ProjectModel } from "@/modules/projects/models/project.model";
import { AppError } from "@/utils/AppError";
import { sendSuccess } from "@/utils/response";
import {
  DELIVERY_MODE_TO_SETUP_TYPE,
  ProjectDevOpsInfoModel,
  SETUP_TYPE_TO_DELIVERY_MODE,
  type DevOpsSetupType,
} from "../models/projectDevOpsInfo.model";
import {
  projectDevOpsInfoRequestSchema,
  type ProjectDevOpsInfoRequest,
} from "../validators/projectDevOpsInfo.validators";
import { recomputeProjectDevOpsCompletion } from "../services/projectDevOpsInfo.service";

const emptyState = (projectId: string) => ({
  exists: false,
  projectId,
  linkedDevOpsProjectId: null,
  setupType: "none" as const,
  deliveryMode: "none" as const,
  provisioningStatus: "not_started" as const,
  sourceArtifact: {
    type: "none" as const,
    name: "",
    version: "",
    location: "",
    checksum: "",
    notes: "",
  },
  environment: {
    environmentName: "",
    accessUrl: "",
    repositoryUrl: "",
    branch: "",
    pipelineUrl: "",
    networkNotes: "",
  },
  notes: "",
  blockers: "",
  completionStatus: "empty" as const,
  createdBy: null,
  updatedBy: null,
  createdAt: null,
  updatedAt: null,
  version: 0,
});

function hasText(value: string) {
  return value.length > 0;
}

function computeCompletionStatus(input: ProjectDevOpsInfoRequest, setupType: DevOpsSetupType) {
  const { sourceArtifact: artifact, environment, provisioningStatus } = input;
  const hasAnyData =
    setupType !== "none" ||
    provisioningStatus !== "not_started" ||
    artifact.type !== "none" ||
    [artifact.name, artifact.version, artifact.location, artifact.checksum, artifact.notes].some(
      hasText
    ) ||
    Object.values(environment).some(hasText) ||
    hasText(input.notes) ||
    hasText(input.blockers) ||
    Boolean(input.linkedDevOpsProjectId);

  if (!hasAnyData) return "empty" as const;

  const artifactReady = hasText(artifact.name) && hasText(artifact.location);
  const setupReady =
    setupType === "none" ||
    (["virtualized_environment", "containerized_environment", "mobile_app", "direct_installation"].includes(setupType) && artifactReady) ||
    (setupType === "external_client_environment" && hasText(environment.accessUrl)) ||
    (setupType === "other" && (hasText(input.notes) || hasText(artifact.notes) || hasText(environment.environmentName)));
  const blockersReady =
    !["blocked", "failed"].includes(provisioningStatus) || hasText(input.blockers);

  return setupReady && blockersReady && provisioningStatus === "ready"
    ? ("complete" as const)
    : ("partial" as const);
}

function toResponse(record: InstanceType<typeof ProjectDevOpsInfoModel>) {
  return {
    exists: true,
    id: String(record._id),
    projectId: String(record.projectId),
    linkedDevOpsProjectId: record.linkedDevOpsProjectId
      ? String(record.linkedDevOpsProjectId)
      : null,
    setupType: record.setupType || DELIVERY_MODE_TO_SETUP_TYPE[record.deliveryMode],
    deliveryMode: record.deliveryMode,
    provisioningStatus: record.provisioningStatus,
    sourceArtifact: record.sourceArtifact,
    environment: record.environment,
    notes: record.notes,
    blockers: record.blockers,
    completionStatus: record.completionStatus,
    createdBy: String(record.createdBy),
    updatedBy: String(record.updatedBy),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    version: record.version,
  };
}

export const getProjectDevOpsInfo: RequestHandler = async (req, res, next) => {
  try {
    const projectId = String(req.params.id);
    const record = await ProjectDevOpsInfoModel.findOne({ projectId });
    return sendSuccess(res, record ? toResponse(record) : emptyState(projectId));
  } catch (error) {
    next(error);
  }
};

export const putProjectDevOpsInfo: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", HTTP_STATUS.UNAUTHORIZED);

    const projectId = String(req.params.id);
    const input = projectDevOpsInfoRequestSchema.parse(req.body);
    const setupType = input.setupType || DELIVERY_MODE_TO_SETUP_TYPE[input.deliveryMode!];
    const deliveryMode = SETUP_TYPE_TO_DELIVERY_MODE[setupType];
    if (input.linkedDevOpsProjectId) {
      const linkedProjectExists = await ProjectModel.exists({ _id: input.linkedDevOpsProjectId });
      if (!linkedProjectExists) {
        throw new AppError("Linked DevOps project not found", HTTP_STATUS.BAD_REQUEST);
      }
    }

    const record = await ProjectDevOpsInfoModel.findOneAndUpdate(
      { projectId },
      {
        $set: {
          linkedDevOpsProjectId: input.linkedDevOpsProjectId ?? null,
          setupType,
          deliveryMode,
          provisioningStatus: input.provisioningStatus,
          sourceArtifact: input.sourceArtifact,
          environment: input.environment,
          notes: input.notes,
          blockers: input.blockers,
          completionStatus: computeCompletionStatus(input, setupType),
          updatedBy: req.user.id,
        },
        $setOnInsert: { projectId, createdBy: req.user.id },
        $inc: { version: 1 },
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    if (!record) {
      throw new AppError("DevOps info could not be saved", HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
    await recomputeProjectDevOpsCompletion(record, req.user.id);
    return sendSuccess(res, toResponse(record));
  } catch (error) {
    next(error);
  }
};
