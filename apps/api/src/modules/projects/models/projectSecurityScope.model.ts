import mongoose, { Schema, type InferSchemaType } from "mongoose";
import {
  PROJECT_SECURITY_TARGET_TYPES,
  SECURITY_SCOPE_MODES,
} from "../constants/securityScope";

const projectSecurityScopeSchema = new Schema(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    targetType: {
      type: String,
      enum: PROJECT_SECURITY_TARGET_TYPES,
      required: true,
    },
    standardKey: { type: String, required: true, trim: true, lowercase: true },
    standardVersion: { type: String, required: true, trim: true },
    scopeMode: { type: String, enum: SECURITY_SCOPE_MODES, required: true },
    selectedNodeIds: { type: [String], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

projectSecurityScopeSchema.index({ projectId: 1 }, { unique: true });
projectSecurityScopeSchema.index({ targetType: 1, standardKey: 1, standardVersion: 1 });

export type ProjectSecurityScopeDocument = InferSchemaType<
  typeof projectSecurityScopeSchema
> & { _id: mongoose.Types.ObjectId };

export const ProjectSecurityScopeModel = mongoose.model<ProjectSecurityScopeDocument>(
  "ProjectSecurityScope",
  projectSecurityScopeSchema
);
