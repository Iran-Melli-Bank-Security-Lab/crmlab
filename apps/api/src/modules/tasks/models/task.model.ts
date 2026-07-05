import { Schema, type HydratedDocument, type InferSchemaType, model } from "mongoose";
import {
  TASK_PRIORITIES,
  TASK_PRIORITY_VALUES,
  TASK_STATUSES,
  TASK_STATUS_VALUES,
} from "@/constants/tasks";

const taskSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    assigneeId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    priority: {
      type: String,
      enum: TASK_PRIORITY_VALUES,
      default: TASK_PRIORITIES.MEDIUM,
    },
    status: {
      type: String,
      enum: TASK_STATUS_VALUES,
      default: TASK_STATUSES.TODO,
    },
    deadline: { type: Date, required: true },
  },
  { timestamps: true }
);

taskSchema.index({ assigneeId: 1, status: 1, deadline: 1 });
taskSchema.index({ createdBy: 1, createdAt: -1 });

export type Task = InferSchemaType<typeof taskSchema>;
export type TaskDocument = HydratedDocument<Task>;

export const TaskModel = model<Task>("Task", taskSchema);
