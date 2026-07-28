import mongoose, { Schema, type InferSchemaType } from "mongoose";
import {
  PROJECT_PROVISIONING_STATUS_VALUES,
  PROJECT_STATUS,
  PROJECT_TYPE_VALUES,
  type ProjectType,
} from "@/constants/projects";
import { LEGACY_COLLECTIONS } from "@/constants/legacyCollections";

export const PROJECT_IDENTITY_INDEX = {
  name: "projectName_1_version_1_letterNumber_1_type_1",
  key: { projectName: 1, version: 1, letterNumber: 1, type: 1 },
  options: {
    unique: true,
    partialFilterExpression: {
      projectName: { $type: "string" },
      version: { $type: "string" },
      letterNumber: { $type: "string" },
    },
  },
} as const;

const projectIdentifierSchema = new Schema(
  {
    developer: { type: String, trim: true },
    employer: { type: String, trim: true },
    certificateRequest: { type: String, trim: true },
    organizationalUnitName: { type: String, trim: true },
    projectManagerName: { type: String, trim: true },
    unitPhoneNumber: { type: String, trim: true },
    beneficiaryOffice: { type: String, trim: true },
    followerName: { type: String, trim: true },
    beneficiaryPhoneNumber: { type: String, trim: true },
    datacenterName: { type: String, trim: true },
    responsibleName: { type: String, trim: true },
    datacenterPhoneNumber: { type: String, trim: true },
    projectAcceptanceDate: { type: Date },
    reportIssueDate: { type: Date },
    testDate: { type: Date },
    docId: { type: String, trim: true },
  },
  { _id: false }
);

const projectDevopsInfoSchema = new Schema(
  {
    environment: { type: String, trim: true },
    repository: { type: String, trim: true },
    pipeline: { type: String, trim: true },
    deploymentUrl: { type: String, trim: true },
    serverInventory: { type: String, trim: true },
    releaseBranch: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { _id: false }
);

const provisioningHistorySchema = new Schema(
  {
    previousStatus: {
      type: String,
      enum: PROJECT_PROVISIONING_STATUS_VALUES,
      required: true,
    },
    newStatus: {
      type: String,
      enum: PROJECT_PROVISIONING_STATUS_VALUES,
      required: true,
    },
    actingUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    actingUserRole: { type: String, required: true },
    timestamp: { type: Date, required: true, default: Date.now },
    notes: { type: String, trim: true },
    failureReason: { type: String, trim: true },
    technicalDescription: { type: String, trim: true },
    recommendedAction: { type: String, trim: true },
    resolutionMessage: { type: String, trim: true },
    evidence: { type: [String], default: undefined },
    attemptNumber: { type: Number, required: true, min: 1 },
  },
  { _id: true }
);

const projectSchema = new Schema(
  {
    projectName: { type: String, required: true, trim: true },
    type: { type: String },
    description: { type: Schema.Types.Mixed },
    status: { type: String, default: PROJECT_STATUS.OPEN },
    ownerId: { type: Schema.Types.ObjectId, ref: "User" },

    // Legacy production field. New code must write `type` only.
    // Kept for reading documents created before the canonical field existed.
    projectType: { type: [String], default: undefined },

    // Legacy-compatible project identity fields.
    projectGroupId: { type: String, trim: true },
    canonicalName: { type: String, trim: true, lowercase: true },
    letterNumber: { type: String, trim: true },
    version: { type: String, trim: true },
    platform: { type: [String], default: [] },
    certificateRequired: { type: Boolean, default: false },
    certificateAuthorities: {
      type: [{ type: String, trim: true }],
      default: [],
    },
    descriptions: { type: [String], default: undefined },
    identifier: projectIdentifierSchema,
    devopsInfo: projectDevopsInfoSchema,

    // Project-level managers from the legacy model.
    projectManager: { type: Schema.Types.ObjectId, ref: "User" },
    qualityManager: { type: Schema.Types.ObjectId, ref: "User" },
    devops: { type: Schema.Types.ObjectId, ref: "User" },
    representative: { type: Schema.Types.ObjectId, ref: "User" },

    // Missing on legacy projects means ready. New project creation always sets
    // this explicitly to AWAITING_DEVOPS_SETUP.
    provisioningStatus: {
      type: String,
      enum: PROJECT_PROVISIONING_STATUS_VALUES,
      default: undefined,
    },
    provisioningAttemptNumber: { type: Number, min: 1, default: undefined },
    provisioningHistory: { type: [provisioningHistorySchema], default: [] },
    devopsConfirmedBy: { type: Schema.Types.ObjectId, ref: "User" },
    devopsConfirmedAt: { type: Date },
    devopsNotes: { type: String, trim: true },
    devopsFailureReason: { type: String, trim: true },
    devopsFailureDescription: { type: String, trim: true },
    devopsRecommendedAction: { type: String, trim: true },
    devopsFailureEvidence: { type: [String], default: undefined },
    devopsFailureAt: { type: Date },
    provisioningBlockedAt: { type: Date },
    provisioningBlockedDurationMs: { type: Number, min: 0, default: 0 },
    devopsResolutionMessage: { type: String, trim: true },
    devopsResolutionSubmittedAt: { type: Date },
    devopsResolutionSubmittedBy: { type: Schema.Types.ObjectId, ref: "User" },

    // Temporary compatibility fields. ProjectAssignment should become the source of truth.
    assignedUserIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    userProject: [{ type: Schema.Types.ObjectId, ref: "ProjectAssignment" }],

    expireDay: { type: Date },
    testExpiresAt: { type: Date },
    expireDayQuality: { type: Date },
    verifiedByAdmin: { type: Date },
    verifiedReportByAdmin: { type: Date },
    numberOfTest: { type: Number },
    reportPassword: { type: String, default: "" },
    created_date: { type: Date },
  },
  {
    collection: LEGACY_COLLECTIONS.projects,
    timestamps: true,
    autoCreate: false,
    autoIndex: false,
  }
);

projectSchema.pre("validate", function () {
  this.ownerId ||= this.projectManager;
  this.canonicalName ||= this.projectName
    ?.trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  this.projectGroupId ||= new mongoose.Types.ObjectId().toString();
  this.testExpiresAt ||= this.expireDay || this.expireDayQuality;

  // One-way compatibility: old documents can populate the canonical field,
  // but new canonical writes never recreate the legacy field.
  if (!this.type && this.projectType?.length) {
    const [firstType] = this.projectType;
    const normalizedType = firstType.toLowerCase();
    if ((PROJECT_TYPE_VALUES as readonly string[]).includes(normalizedType)) {
      this.type = normalizedType as ProjectType;
    }
  }
});

projectSchema.index({ projectName: 1 });
projectSchema.index({ projectGroupId: 1, createdAt: -1 });
projectSchema.index({ canonicalName: 1, createdAt: -1 });
projectSchema.index(
  PROJECT_IDENTITY_INDEX.key,
  {
    name: PROJECT_IDENTITY_INDEX.name,
    ...PROJECT_IDENTITY_INDEX.options,
  }
);
projectSchema.index({ ownerId: 1, status: 1, createdAt: -1 });
projectSchema.index({ type: 1, status: 1, createdAt: -1 });
projectSchema.index({ projectType: 1, status: 1 });
projectSchema.index({ projectManager: 1, status: 1 });
projectSchema.index({ qualityManager: 1, status: 1 });
projectSchema.index({ devops: 1, status: 1 });
projectSchema.index({ representative: 1, status: 1 });
projectSchema.index({ devops: 1, provisioningStatus: 1, testExpiresAt: 1 });
projectSchema.index({ representative: 1, provisioningStatus: 1, testExpiresAt: 1 });
projectSchema.index({ assignedUserIds: 1, status: 1 });
projectSchema.index({ userProject: 1 });
projectSchema.index({ letterNumber: 1 });
projectSchema.index({ "identifier.docId": 1 });

export type ProjectDocument = InferSchemaType<typeof projectSchema> & { _id: mongoose.Types.ObjectId };
export const ProjectModel = mongoose.model<ProjectDocument>(
  "Project",
  projectSchema,
  LEGACY_COLLECTIONS.projects
);
