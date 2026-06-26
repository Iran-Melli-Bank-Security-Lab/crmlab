import mongoose, { Schema, type HydratedDocument, type InferSchemaType } from "mongoose";
import { ALL_PERMISSIONS, type Permission } from "@/constants/permissions";
import { ALL_ROLES, type Role } from "@/constants/roles";

const roleSchema = new Schema(
  {
    key: {
      type: String,
      enum: ALL_ROLES,
      required: true,
      unique: true,
      immutable: true,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    permissions: {
      type: [String],
      enum: ALL_PERMISSIONS,
      default: [],
    },
    isSystem: { type: Boolean, default: true },
  },
  { timestamps: true }
);

roleSchema.pre("validate", function () {
  this.permissions = Array.from(new Set(this.permissions as Permission[]));
});

export type RoleDocument = HydratedDocument<InferSchemaType<typeof roleSchema>> & {
  _id: mongoose.Types.ObjectId;
  key: Role;
  permissions: Permission[];
};

export const RoleModel = mongoose.model<RoleDocument>("Role", roleSchema);
