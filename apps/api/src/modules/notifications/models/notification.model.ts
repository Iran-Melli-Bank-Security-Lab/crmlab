import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { NOTIFICATION_PRIORITIES } from "@/constants/notifications";

const notificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
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
  },
  { collection: "notifications", timestamps: true, strict: false }
);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, projectId: 1, createdAt: -1 });
notificationSchema.index({ type: 1, createdAt: -1 });

export type NotificationDocument = InferSchemaType<typeof notificationSchema> & { _id: mongoose.Types.ObjectId };
export const NotificationModel = mongoose.model<NotificationDocument>("Notification", notificationSchema);
