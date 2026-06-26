import mongoose, { Schema, type InferSchemaType } from "mongoose";

const authSessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tokenId: { type: String, required: true, unique: true, index: true },
    refreshTokenHash: { type: String, required: true, unique: true, index: true },
    sessionVersion: { type: Number, required: true },
    userAgent: { type: String },
    ip: { type: String },
    expiresAt: { type: Date, required: true, index: true },
    revokedAt: { type: Date },
    replacedByTokenId: { type: String },
  },
  { timestamps: true }
);

export type AuthSessionDocument = InferSchemaType<typeof authSessionSchema> & { _id: mongoose.Types.ObjectId };
export const AuthSessionModel = mongoose.model<AuthSessionDocument>("AuthSession", authSessionSchema);
