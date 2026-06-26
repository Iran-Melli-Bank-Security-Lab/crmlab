import mongoose, { Schema, type InferSchemaType } from "mongoose";
import {
  PROJECT_ASSIGNMENT_ROLE_VALUES,
  PROJECT_ASSIGNMENT_ROLES,
  PROJECT_ASSIGNMENT_STATUS,
  PROJECT_ASSIGNMENT_STATUS_VALUES,
} from "@/constants/projects";

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
      enum: PROJECT_ASSIGNMENT_ROLE_VALUES,
      default: PROJECT_ASSIGNMENT_ROLES.PENTESTER,
    },

    // Legacy field names from the existing projectusers collection.
    project: { type: Schema.Types.ObjectId, ref: "Project" },
    pentester: { type: Schema.Types.ObjectId, ref: "User" },
    manager: { type: Schema.Types.ObjectId, ref: "User" },

    version: { type: String, trim: true },
    status: {
      type: String,
      enum: PROJECT_ASSIGNMENT_STATUS_VALUES,
      default: PROJECT_ASSIGNMENT_STATUS.OPEN,
    },
    progress: { type: Number, default: 0, min: 0, max: 100 },

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
  },
  {
    collection: "projectusers",
    timestamps: true,
  }
);

projectAssignmentSchema.pre("validate", function () {
  this.projectId ||= this.project;
  this.project ||= this.projectId;

  this.userId ||= this.pentester;
  this.pentester ||= this.userId;

  this.managerId ||= this.manager;
  this.manager ||= this.managerId;
});

projectAssignmentSchema.index(
  { projectId: 1, userId: 1, version: 1, assignmentRole: 1 },
  {
    unique: true,
    partialFilterExpression: {
      projectId: { $exists: true },
      userId: { $exists: true },
      version: { $type: "string" },
      assignmentRole: { $type: "string" },
    },
  }
);
projectAssignmentSchema.index(
  { project: 1, pentester: 1, version: 1 },
  {
    unique: true,
    partialFilterExpression: {
      project: { $exists: true },
      pentester: { $exists: true },
      version: { $type: "string" },
    },
  }
);
projectAssignmentSchema.index({ userId: 1, status: 1, updatedAt: -1 });
projectAssignmentSchema.index({ projectId: 1, status: 1, updatedAt: -1 });
projectAssignmentSchema.index({ managerId: 1, status: 1, updatedAt: -1 });
projectAssignmentSchema.index({ assignedById: 1, createdAt: -1 });
projectAssignmentSchema.index({ assignmentRole: 1, status: 1 });
projectAssignmentSchema.index({ "bugScopes.wstg": 1 });
projectAssignmentSchema.index({ "bugScopes.status": 1 });
projectAssignmentSchema.index({ finishDate: 1 });
projectAssignmentSchema.index({ pendingDate: 1 });

export type ProjectAssignmentDocument = InferSchemaType<typeof projectAssignmentSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const ProjectAssignmentModel = mongoose.model<ProjectAssignmentDocument>(
  "ProjectAssignment",
  projectAssignmentSchema
);
