import mongoose, { Schema, type InferSchemaType } from "mongoose";

const projectTableSettingSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    context: { type: String, required: true },
    visibleColumns: { type: [String], default: [] },
    columnOrder: { type: [String], default: [] },
    aliases: { type: Map, of: String, default: {} },
  },
  { timestamps: true }
);

projectTableSettingSchema.index({ userId: 1, context: 1 }, { unique: true });

export type ProjectTableSettingDocument = InferSchemaType<
  typeof projectTableSettingSchema
> & { _id: mongoose.Types.ObjectId };

export const ProjectTableSettingModel = mongoose.model<ProjectTableSettingDocument>(
  "ProjectTableSetting",
  projectTableSettingSchema
);
