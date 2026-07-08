import {
  DELIVERY_MODE_TO_SETUP_TYPE,
  ProjectDevOpsInfoModel,
} from "../models/projectDevOpsInfo.model";
import { RuntimeInstanceModel, TestTargetModel } from "../models/devOpsResource.model";
import { ProjectDevOpsArtifactModel } from "../models/projectDevOpsArtifact.model";

export async function ensureProjectDevOpsInfo(projectId: string, actorUserId: string) {
  return ProjectDevOpsInfoModel.findOneAndUpdate(
    { projectId },
    {
      $setOnInsert: {
        projectId,
        linkedDevOpsProjectId: null,
        setupType: "none",
        deliveryMode: "none",
        provisioningStatus: "not_started",
        sourceArtifact: {},
        environment: {},
        notes: "",
        blockers: "",
        completionStatus: "empty",
        createdBy: actorUserId,
        updatedBy: actorUserId,
        version: 1,
      },
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );
}

function overviewHasData(info: InstanceType<typeof ProjectDevOpsInfoModel>) {
  const setupType = info.setupType || DELIVERY_MODE_TO_SETUP_TYPE[info.deliveryMode];
  return (
    setupType !== "none" ||
    info.provisioningStatus !== "not_started" ||
    info.sourceArtifact.type !== "none" ||
    Boolean(info.linkedDevOpsProjectId) ||
    Boolean(info.notes || info.blockers) ||
    [
      info.environment.environmentName,
      info.environment.accessUrl,
      info.environment.repositoryUrl,
      info.environment.branch,
      info.environment.pipelineUrl,
      info.environment.networkNotes,
      info.sourceArtifact.name,
      info.sourceArtifact.version,
      info.sourceArtifact.location,
      info.sourceArtifact.checksum,
      info.sourceArtifact.notes,
    ].some(Boolean)
  );
}

export async function recomputeProjectDevOpsCompletion(
  info: InstanceType<typeof ProjectDevOpsInfoModel>,
  actorUserId: string
) {
  const [hasInstance, hasTarget, hasMobileArtifact] = await Promise.all([
    RuntimeInstanceModel.exists({ projectId: info.projectId, devOpsInfoId: info._id }),
    TestTargetModel.exists({ projectId: info.projectId, devOpsInfoId: info._id }),
    ProjectDevOpsArtifactModel.exists({ projectId: info.projectId, devOpsInfoId: info._id }),
  ]);
  const hasResource = Boolean(hasInstance || hasTarget);
  const setupType = info.setupType || DELIVERY_MODE_TO_SETUP_TYPE[info.deliveryMode];
  const artifactReady = Boolean(
    info.sourceArtifact.name && info.sourceArtifact.location
  );
  const setupReady =
    setupType === "none" ||
    (setupType === "external_client_environment" && Boolean(info.environment.accessUrl)) ||
    (setupType === "mobile_app" && (artifactReady || Boolean(hasMobileArtifact))) ||
    (setupType === "virtualized_environment" && artifactReady && Boolean(hasInstance)) ||
    (setupType === "containerized_environment" && artifactReady && Boolean(hasInstance)) ||
    (setupType === "direct_installation" && artifactReady) ||
    (setupType === "other" && overviewHasData(info));
  const completionStatus =
    info.provisioningStatus === "ready" && setupReady
      ? "complete"
      : overviewHasData(info) || hasResource
        ? "partial"
        : "empty";

  if (info.completionStatus !== completionStatus) {
    info.completionStatus = completionStatus;
    info.updatedBy = actorUserId as never;
    info.version += 1;
    await info.save();
  }
  return completionStatus;
}
