import mongoose, { Schema, type InferSchemaType } from "mongoose";

export const RUNTIME_INSTANCE_TYPES = ["vm", "container", "shared", "external"] as const;
export const RUNTIME_INSTANCE_STATUSES = [
  "pending",
  "provisioning",
  "ready",
  "failed",
  "retired",
] as const;
export const TEST_TARGET_TYPES = [
  "web",
  "api",
  "admin",
  "desktop",
  "mobile",
  "endpoint",
  "other",
] as const;

const auditFields = {
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
};

const runtimeInstanceSchema = new Schema(
  {
    devOpsInfoId: { type: Schema.Types.ObjectId, ref: "ProjectDevOpsInfo", required: true },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    assignedUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    name: { type: String, trim: true, required: true },
    type: { type: String, enum: RUNTIME_INSTANCE_TYPES, required: true },
    status: { type: String, enum: RUNTIME_INSTANCE_STATUSES, required: true },
    accessUrl: { type: String, trim: true, default: "" },
    consoleUrl: { type: String, trim: true, default: "" },
    host: { type: String, trim: true, default: "" },
    port: { type: Number, min: 1, max: 65535, default: null },
    networkNotes: { type: String, trim: true, default: "" },
    notes: { type: String, trim: true, default: "" },
    ...auditFields,
  },
  { timestamps: true, strict: "throw" }
);
runtimeInstanceSchema.index({ projectId: 1, devOpsInfoId: 1, updatedAt: -1 });
runtimeInstanceSchema.index({ projectId: 1, assignedUserId: 1 });

const testTargetSchema = new Schema(
  {
    devOpsInfoId: { type: Schema.Types.ObjectId, ref: "ProjectDevOpsInfo", required: true },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    runtimeInstanceId: { type: Schema.Types.ObjectId, ref: "RuntimeInstance", default: null },
    name: { type: String, trim: true, required: true },
    type: { type: String, enum: TEST_TARGET_TYPES, required: true },
    url: { type: String, trim: true, default: "" },
    version: { type: String, trim: true, default: "" },
    authRequired: { type: Boolean, default: false },
    notes: { type: String, trim: true, default: "" },
    ...auditFields,
  },
  { timestamps: true, strict: "throw" }
);
testTargetSchema.index({ projectId: 1, devOpsInfoId: 1, updatedAt: -1 });
testTargetSchema.index({ projectId: 1, runtimeInstanceId: 1 });

export type RuntimeInstanceDocument = InferSchemaType<typeof runtimeInstanceSchema> & {
  _id: mongoose.Types.ObjectId;
};
export type TestTargetDocument = InferSchemaType<typeof testTargetSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const RuntimeInstanceModel = mongoose.model<RuntimeInstanceDocument>(
  "RuntimeInstance",
  runtimeInstanceSchema
);
export const TestTargetModel = mongoose.model<TestTargetDocument>("TestTarget", testTargetSchema);
