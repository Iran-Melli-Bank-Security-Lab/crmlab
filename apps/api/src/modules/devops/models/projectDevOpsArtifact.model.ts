import mongoose, { Schema, type InferSchemaType } from "mongoose";

export const MOBILE_ARTIFACT_TYPES = ["apk", "ipa", "file", "download_url"] as const;
export const MOBILE_PLATFORMS = ["android", "ios", "both", "other"] as const;

const projectDevOpsArtifactSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    devOpsInfoId: { type: Schema.Types.ObjectId, ref: "ProjectDevOpsInfo", required: true },
    setupType: { type: String, enum: ["mobile_app"], required: true },
    artifactType: { type: String, enum: MOBILE_ARTIFACT_TYPES, required: true },
    name: { type: String, required: true, trim: true },
    version: { type: String, trim: true, default: "" },
    platform: { type: String, enum: MOBILE_PLATFORMS, required: true },
    fileRef: { type: String, trim: true, default: "" },
    downloadUrl: { type: String, trim: true, default: "" },
    checksum: { type: String, trim: true, default: "" },
    buildNumber: { type: String, trim: true, default: "" },
    packageName: { type: String, trim: true, default: "" },
    bundleId: { type: String, trim: true, default: "" },
    minOsVersion: { type: String, trim: true, default: "" },
    deviceNotes: { type: String, trim: true, default: "" },
    installNotes: { type: String, trim: true, default: "" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true, strict: "throw" }
);

projectDevOpsArtifactSchema.index({ projectId: 1, devOpsInfoId: 1, updatedAt: -1 });

export type ProjectDevOpsArtifactDocument = InferSchemaType<typeof projectDevOpsArtifactSchema> & {
  _id: mongoose.Types.ObjectId;
};
export const ProjectDevOpsArtifactModel = mongoose.model<ProjectDevOpsArtifactDocument>(
  "ProjectDevOpsArtifact",
  projectDevOpsArtifactSchema
);
