import mongoose, { Schema, type InferSchemaType } from "mongoose";

export const DEVOPS_DELIVERY_MODES = [
  "ovf",
  "docker",
  "external_url",
  "mobile_files",
  "none",
  "other",
] as const;

export const DEVOPS_SETUP_TYPES = [
  "virtualized_environment",
  "containerized_environment",
  "external_client_environment",
  "mobile_app",
  "direct_installation",
  "none",
  "other",
] as const;

export type DevOpsSetupType = (typeof DEVOPS_SETUP_TYPES)[number];
export type DevOpsDeliveryMode = (typeof DEVOPS_DELIVERY_MODES)[number];

export const DELIVERY_MODE_TO_SETUP_TYPE: Record<DevOpsDeliveryMode, DevOpsSetupType> = {
  ovf: "virtualized_environment",
  docker: "containerized_environment",
  external_url: "external_client_environment",
  mobile_files: "mobile_app",
  none: "none",
  other: "other",
};

export const SETUP_TYPE_TO_DELIVERY_MODE: Record<DevOpsSetupType, DevOpsDeliveryMode> = {
  virtualized_environment: "ovf",
  containerized_environment: "docker",
  external_client_environment: "external_url",
  mobile_app: "mobile_files",
  direct_installation: "other",
  none: "none",
  other: "other",
};

export const DEVOPS_PROVISIONING_STATUSES = [
  "not_started",
  "preparing",
  "partially_ready",
  "ready",
  "blocked",
  "failed",
  "retired",
] as const;

export const DEVOPS_ARTIFACT_TYPES = [
  "ovf",
  "ova",
  "docker_image",
  "docker_compose",
  "apk",
  "ipa",
  "file",
  "download_url",
  "repository",
  "none",
  "other",
] as const;

export const DEVOPS_COMPLETION_STATUSES = ["empty", "partial", "complete"] as const;

const sourceArtifactSchema = new Schema(
  {
    type: { type: String, enum: DEVOPS_ARTIFACT_TYPES, default: "none" },
    name: { type: String, trim: true, default: "" },
    version: { type: String, trim: true, default: "" },
    location: { type: String, trim: true, default: "" },
    checksum: { type: String, trim: true, default: "" },
    notes: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const environmentSchema = new Schema(
  {
    environmentName: { type: String, trim: true, default: "" },
    accessUrl: { type: String, trim: true, default: "" },
    repositoryUrl: { type: String, trim: true, default: "" },
    branch: { type: String, trim: true, default: "" },
    pipelineUrl: { type: String, trim: true, default: "" },
    networkNotes: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const projectDevOpsInfoSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    linkedDevOpsProjectId: { type: Schema.Types.ObjectId, ref: "Project", default: null },
    setupType: { type: String, enum: DEVOPS_SETUP_TYPES },
    deliveryMode: { type: String, enum: DEVOPS_DELIVERY_MODES, required: true },
    provisioningStatus: {
      type: String,
      enum: DEVOPS_PROVISIONING_STATUSES,
      required: true,
    },
    sourceArtifact: { type: sourceArtifactSchema, default: () => ({}) },
    environment: { type: environmentSchema, default: () => ({}) },
    notes: { type: String, trim: true, default: "" },
    blockers: { type: String, trim: true, default: "" },
    completionStatus: { type: String, enum: DEVOPS_COMPLETION_STATUSES, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    version: { type: Number, min: 1, required: true },
  },
  { timestamps: true, strict: "throw" }
);

projectDevOpsInfoSchema.index({ projectId: 1 }, { unique: true });

projectDevOpsInfoSchema.pre("validate", function () {
  if (this.setupType) {
    this.deliveryMode = SETUP_TYPE_TO_DELIVERY_MODE[this.setupType];
  } else if (this.deliveryMode) {
    this.setupType = DELIVERY_MODE_TO_SETUP_TYPE[this.deliveryMode];
  }
});

export type ProjectDevOpsInfoDocument = InferSchemaType<typeof projectDevOpsInfoSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const ProjectDevOpsInfoModel = mongoose.model<ProjectDevOpsInfoDocument>(
  "ProjectDevOpsInfo",
  projectDevOpsInfoSchema
);
