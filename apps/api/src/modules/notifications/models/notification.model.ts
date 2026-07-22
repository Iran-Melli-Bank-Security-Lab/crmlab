import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { NOTIFICATION_PRIORITIES } from "@/constants/notifications";

export const NOTIFICATION_DEDUPE_INDEX = {
  name: "userId_1_dedupeKey_1",
  key: { userId: 1, dedupeKey: 1 },
  options: {
    unique: true,
    partialFilterExpression: {
      userId: { $exists: true },
      dedupeKey: { $type: "string" },
    },
  },
} as const;

const notificationSchema = new Schema(
  {
    // userId is canonical. The aliases remain declared so legacy records can be
    // queried and marked read without rewriting them during application startup.
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    recipientId: { type: Schema.Types.ObjectId, ref: "User" },
    recipient: { type: Schema.Types.ObjectId, ref: "User" },
    user: { type: Schema.Types.ObjectId, ref: "User" },
    projectId: { type: Schema.Types.ObjectId, ref: "Project" },
    type: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    priority: { type: String, default: NOTIFICATION_PRIORITIES.MEDIUM },
    isRead: { type: Boolean },
    seen: { type: Boolean },
    seenAt: { type: Date },
    actionUrl: { type: String },
    link: { type: String },
    fromUserId: { type: Schema.Types.ObjectId, ref: "User" },
    category: { type: String },
    data: { type: Schema.Types.Mixed },
    icon: { type: String },
    entityId: { type: String },
    deliveredAt: { type: Date },
    status: { type: String },
    actionRequired: { type: Boolean },
    expiresAt: { type: Date },
    dedupeKey: { type: String },
  },
  {
    collection: "notifications",
    timestamps: true,
    strict: false,
    autoCreate: false,
    autoIndex: false,
  }
);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, projectId: 1, createdAt: -1 });
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index(NOTIFICATION_DEDUPE_INDEX.key, {
  name: NOTIFICATION_DEDUPE_INDEX.name,
  ...NOTIFICATION_DEDUPE_INDEX.options,
});

export type NotificationDocument = InferSchemaType<typeof notificationSchema> & { _id: mongoose.Types.ObjectId };
export const NotificationModel = mongoose.model<NotificationDocument>("Notification", notificationSchema);
