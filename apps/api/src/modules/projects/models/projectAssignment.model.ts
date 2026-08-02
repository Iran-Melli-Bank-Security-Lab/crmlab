import mongoose, { Schema, type InferSchemaType } from "mongoose";
import {
  PROJECT_ASSIGNMENT_ROLES,
  PROJECT_ASSIGNMENT_STATUS,
  PROJECT_ASSIGNMENT_STATUS_VALUES,
} from "@/constants/projects";
import { SECURITY_SCOPE_MODES } from "../constants/securityScope";
import { LEGACY_COLLECTIONS } from "@/constants/legacyCollections";

export const PROJECT_ASSIGNMENT_IDENTITY_INDEX = {
  name: "projectId_1_userId_1_version_1_assignmentRole_1",
  key: { projectId: 1, userId: 1, version: 1, assignmentRole: 1 },
  options: {
    unique: true,
    partialFilterExpression: {
      projectId: { $exists: true },
      userId: { $exists: true },
      version: { $type: "string" },
      assignmentRole: { $type: "string" },
    },
  },
} as const;

export const LEGACY_PENTESTER_IDENTITY_INDEX = {
  name: "project_1_pentester_1_version_1",
  key: { project: 1, pentester: 1, version: 1 },
  options: {
    unique: true,
    partialFilterExpression: {
      project: { $exists: true },
      pentester: { $exists: true },
      version: { $type: "string" },
    },
  },
} as const;

const securityScopeSchema = new Schema(
  {
    standardKey: { type: String, required: true, trim: true, lowercase: true },
    standardVersion: { type: String, required: true, trim: true },
    scopeMode: { type: String, enum: SECURITY_SCOPE_MODES, required: true },
    selectedNodeIds: { type: [String], default: [] },
  },
  { _id: false }
);

const bugScopeSchema = new Schema(
  {
    id: { type: String, trim: true },
    label: { type: String, trim: true },
    labelfa: { type: String, trim: true },
    wstg: { type: String, trim: true },
    status: { type: String, default: "notAttempted" },
  },
  { _id: false }
);

bugScopeSchema.add({
  children: [bugScopeSchema],
});

const stateChangeSchema = new Schema(
  {
    state: {
      type: String,
      enum: PROJECT_ASSIGNMENT_STATUS_VALUES,
      required: true,
    },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const projectAssignmentSchema = new Schema(
  {
    // Clean field names for new code.
    projectId: { type: Schema.Types.ObjectId, ref: "Project" },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    managerId: { type: Schema.Types.ObjectId, ref: "User" },
    assignedById: { type: Schema.Types.ObjectId, ref: "User" },
    assignmentRole: {
      type: String,
      default: PROJECT_ASSIGNMENT_ROLES.PENTESTER,
    },

    // Legacy field names from the existing projectusers collection.
    project: { type: Schema.Types.ObjectId, ref: "Project" },
    pentester: { type: Schema.Types.ObjectId, ref: "User" },
    manager: { type: Schema.Types.ObjectId, ref: "User" },

    version: { type: String, trim: true },
    status: {
      type: String,
      default: PROJECT_ASSIGNMENT_STATUS.OPEN,
    },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    securityScope: { type: securityScopeSchema, default: undefined },

    bugScopes: { type: [bugScopeSchema], default: [] },
    assignBugScopeForFirst: { type: Boolean, default: true },

    startDate: { type: Date },
    finishDate: { type: Date },
    pendingDate: { type: Date },
    description: { type: String },
    reason: { type: String },
    managerVerifyDate: { type: Date },
    stateChanges: { type: [stateChangeSchema], default: [] },
    totalWorkTime: { type: Number, default: 0, min: 0 },
    workTimerStartedAt: { type: Date, default: null },
    created_at: { type: Date },
    updated_at: { type: Date },
  },
  {
    collection: LEGACY_COLLECTIONS.projectUsers,
    timestamps: true,
    autoCreate: false,
    autoIndex: false,
  }
);

projectAssignmentSchema.pre("validate", function () {
  this.projectId ||= this.project;
  this.userId ||= this.pentester;

  // Legacy identity fields are reserved for pentester rows. Keeping them on
  // manager/DevOps/QA rows makes the legacy unique index conflict with the
  // role-aware assignment index when one user has multiple project roles.
  if (this.assignmentRole === PROJECT_ASSIGNMENT_ROLES.PENTESTER) {
    this.project ||= this.projectId;
    this.pentester ||= this.userId;
  }

  this.managerId ||= this.manager;
  this.manager ||= this.managerId;
});

projectAssignmentSchema.index(
  PROJECT_ASSIGNMENT_IDENTITY_INDEX.key,
  {
    name: PROJECT_ASSIGNMENT_IDENTITY_INDEX.name,
    ...PROJECT_ASSIGNMENT_IDENTITY_INDEX.options,
  }
);
projectAssignmentSchema.index(
  LEGACY_PENTESTER_IDENTITY_INDEX.key,
  {
    name: LEGACY_PENTESTER_IDENTITY_INDEX.name,
    ...LEGACY_PENTESTER_IDENTITY_INDEX.options,
  }
);
projectAssignmentSchema.index({ userId: 1, status: 1, updatedAt: -1 });
projectAssignmentSchema.index({ projectId: 1, status: 1, updatedAt: -1 });
projectAssignmentSchema.index({ managerId: 1, status: 1, updatedAt: -1 });
projectAssignmentSchema.index({ assignedById: 1, createdAt: -1 });
projectAssignmentSchema.index({ assignmentRole: 1, status: 1 });
projectAssignmentSchema.index({
  "securityScope.standardKey": 1,
  "securityScope.standardVersion": 1,
});
projectAssignmentSchema.index({ "bugScopes.wstg": 1 });
projectAssignmentSchema.index({ "bugScopes.status": 1 });
projectAssignmentSchema.index({ finishDate: 1 });
projectAssignmentSchema.index({ pendingDate: 1 });

export type ProjectAssignmentDocument = InferSchemaType<
  typeof projectAssignmentSchema
> & {
  _id: mongoose.Types.ObjectId;
};

export const ProjectAssignmentModel = mongoose.model<ProjectAssignmentDocument>(
  "ProjectAssignment",
  projectAssignmentSchema,
  LEGACY_COLLECTIONS.projectUsers
);
