import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { ALL_PERMISSIONS, type Permission } from "@/constants/permissions";

function uniquePermissions(permissions: Permission[] = []) {
  return Array.from(new Set(permissions));
}

const userPermissionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    permissions: {
      type: [String],
      enum: ALL_PERMISSIONS,
      default: [],
    },
  },
  { timestamps: true }
);

userPermissionSchema.pre("validate", function () {
  this.permissions = uniquePermissions(this.permissions as Permission[]);
});

export type UserPermissionDocument = InferSchemaType<typeof userPermissionSchema> & {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  permissions: Permission[];
};

export const UserPermissionModel = mongoose.model<UserPermissionDocument>("UserPermission", userPermissionSchema);
