import mongoose, { Schema, type InferSchemaType } from "mongoose";

const auditLogSchema = new Schema(
  {
    actorId: { type: Schema.Types.ObjectId, ref: "User" },
    action: { type: String, required: true, index: true },
    module: { type: String, index: true },
    entityType: { type: String, required: true, index: true },
    entityId: { type: String },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", index: true },
    status: { type: String, enum: ["success", "failure"], index: true },
    ip: { type: String },
    userAgent: { type: String },
    previousValue: { type: Schema.Types.Mixed },
    newValue: { type: Schema.Types.Mixed },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

auditLogSchema.index({ actorId: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1, _id: -1 });
auditLogSchema.index({ projectId: 1, createdAt: -1 });

export type AuditLogDocument = InferSchemaType<typeof auditLogSchema> & { _id: mongoose.Types.ObjectId };
export const AuditLogModel = mongoose.model<AuditLogDocument>("AuditLog", auditLogSchema);
