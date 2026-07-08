import mongoose, { Schema, type InferSchemaType } from "mongoose";

export const DEVOPS_CREDENTIAL_TYPES = ["instance_access", "application_accounts"] as const;
export const DEVOPS_CREDENTIAL_SCOPES = [
  "shared_for_all_users",
  "per_user",
  "per_instance",
  "per_target",
] as const;

const accountSchema = new Schema(
  {
    label: { type: String, required: true, trim: true },
    role: { type: String, trim: true, default: "" },
    username: { type: String, trim: true, default: "" },
    // Temporary operational project credentials; replace with encrypted storage before broader deployment.
    password: { type: String, default: "" },
    token: { type: String, default: "" },
    notes: { type: String, trim: true, default: "" },
  },
  { _id: true }
);

const credentialGroupSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    devOpsInfoId: { type: Schema.Types.ObjectId, ref: "ProjectDevOpsInfo", required: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: DEVOPS_CREDENTIAL_TYPES, required: true },
    scope: { type: String, enum: DEVOPS_CREDENTIAL_SCOPES, required: true },
    targetIds: [{ type: Schema.Types.ObjectId, ref: "TestTarget" }],
    instanceIds: [{ type: Schema.Types.ObjectId, ref: "RuntimeInstance" }],
    visibleToUserIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    accounts: { type: [accountSchema], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true, strict: "throw" }
);

credentialGroupSchema.index({ projectId: 1, devOpsInfoId: 1, updatedAt: -1 });
credentialGroupSchema.index({ projectId: 1, visibleToUserIds: 1 });

export type DevOpsCredentialGroupDocument = InferSchemaType<typeof credentialGroupSchema> & {
  _id: mongoose.Types.ObjectId;
};
export const DevOpsCredentialGroupModel = mongoose.model<DevOpsCredentialGroupDocument>(
  "DevOpsCredentialGroup",
  credentialGroupSchema
);
