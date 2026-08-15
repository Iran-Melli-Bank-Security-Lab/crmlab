import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { ALL_ROLES, ROLES, type Role } from "@/constants/roles";
import { LEGACY_COLLECTIONS } from "@/constants/legacyCollections";

type LegacyRoles = {
  User?: number;
  Admin?: number;
};

export type UserLike = {
  roles?: Role[] | LegacyRoles;
  devOps?: boolean;
  devops?: boolean;
  security?: boolean;
  qualityAssurance?: boolean;
};

function identityParts(value?: string) {
  const parts = (value || "").trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || "User",
    lastName: parts.slice(1).join(" ") || parts[0] || "User",
  };
}

export function normalizeRoles(user: UserLike): Role[] {
  const storedRoles = user.roles;
  const roles = new Set<Role>();

  // Once a user has a canonical roles array it is the source of truth. Legacy
  // flags must not be merged into it or a deliberately removed role reappears.
  if (Array.isArray(storedRoles)) {
    storedRoles.forEach((role) => {
      const normalized = String(role).toLowerCase();
      if ((ALL_ROLES as readonly string[]).includes(normalized)) {
        roles.add(normalized as Role);
      } else if (normalized === "user") {
        roles.add(ROLES.REPRESENTATIVE);
      }
    });

    return roles.size ? Array.from(roles) : [ROLES.PENTESTER];
  }

  // Legacy role objects and flags remain readable until the first current
  // user-management write replaces them with a canonical array.
  if (storedRoles?.Admin) roles.add(ROLES.ADMIN);
  if (storedRoles?.User) roles.add(ROLES.REPRESENTATIVE);
  if (user.devOps || user.devops) roles.add(ROLES.DEVOPS);
  if (user.security) roles.add(ROLES.PENTESTER);
  if (user.qualityAssurance) roles.add(ROLES.QA);

  if (!roles.size) roles.add(ROLES.PENTESTER);

  return Array.from(roles);
}

const userSchema = new Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: { type: String, required: true, select: false },
    avatarUrl: { type: String },
    profileImageUrl: { type: String },
    roles: { type: Schema.Types.Mixed, default: [ROLES.PENTESTER] },
    status: { type: String, default: "Active" },
    score: { type: Number, default: 0 },
    devOps: { type: Boolean, default: false },
    devops: { type: Boolean, default: false },
    security: { type: Boolean, default: false },
    qualityAssurance: { type: Boolean, default: false },
    userProject: [{ type: Schema.Types.ObjectId, ref: "ProjectAssignment" }],
    sessionVersion: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  {
    collection: LEGACY_COLLECTIONS.users,
    timestamps: true,
    autoCreate: false,
    autoIndex: false,
  }
);

userSchema.pre("validate", function () {
  if (!this.firstName || !this.lastName) {
    const fallbackName = this.username || undefined;
    const { firstName, lastName } = identityParts(fallbackName);
    this.firstName ||= firstName;
    this.lastName ||= lastName;
  }

  if (!this.username) this.username = `${this.firstName}.${this.lastName}`.toLowerCase();
  if (this.isActive === undefined) this.isActive = this.status !== "Inactive";
  this.roles = Array.from(new Set(normalizeRoles(this as UserLike)));
});

export type UserDocument = InferSchemaType<typeof userSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const UserModel = mongoose.model<UserDocument>(
  "User",
  userSchema,
  LEGACY_COLLECTIONS.users
);
