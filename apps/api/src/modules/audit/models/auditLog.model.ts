import mongoose, { Schema, type InferSchemaType } from "mongoose";

const auditLogSchema = new Schema(
  {
    actorId: { type: Schema.Types.ObjectId, ref: "User" },
    action: { type: String, required: true, index: true },
    entityType: { type: String, required: true, index: true },
    entityId: { type: String },
    ip: { type: String },
    userAgent: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

auditLogSchema.index({ actorId: 1, createdAt: -1 });

export type AuditLogDocument = InferSchemaType<typeof auditLogSchema> & { _id: mongoose.Types.ObjectId };
export const AuditLogModel = mongoose.model<AuditLogDocument>("AuditLog", auditLogSchema);
