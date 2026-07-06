import { Schema, model, type HydratedDocument } from "mongoose";

export const SECURITY_STANDARD_TYPES = [
  "web",
  "api",
  "mobile",
  "desktop",
  "sdlc",
  "hardware",
  "blockchain",
  "ai",
  "other",
] as const;

export type SecurityStandardType = (typeof SECURITY_STANDARD_TYPES)[number];

export type SecurityStandardNode = {
  nodeId: string;
  label: string;
  labelFa?: string;
  description?: string;
  impact?: string;
  exploit?: string;
  exploitFa?: string;
  solution?: string;
  code?: string;
  referenceUrl?: string;
  order: number;
  children?: SecurityStandardNode[];
};

export type SecurityStandard = {
  standardKey: string;
  name: string;
  shortName: string;
  version: string;
  type: SecurityStandardType;
  isActive: boolean;
  nodes: SecurityStandardNode[];
  createdAt?: Date;
  updatedAt?: Date;
};

const securityStandardNodeSchema = new Schema<SecurityStandardNode>(
  {
    nodeId: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    labelFa: { type: String, trim: true },
    description: { type: String, trim: true },
    impact: { type: String, trim: true },
    exploit: { type: String, trim: true },
    exploitFa: { type: String, trim: true },
    solution: { type: String, trim: true },
    code: { type: String, trim: true },
    referenceUrl: { type: String, trim: true },
    order: { type: Number, default: 0 },
  },
  { _id: false, id: false }
);

securityStandardNodeSchema.add({
  children: { type: [securityStandardNodeSchema], default: [] },
});

const securityStandardSchema = new Schema<SecurityStandard>(
  {
    standardKey: { type: String, required: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true },
    shortName: { type: String, required: true, trim: true },
    version: { type: String, required: true, trim: true },
    type: { type: String, enum: SECURITY_STANDARD_TYPES, required: true },
    isActive: { type: Boolean, default: true },
    nodes: { type: [securityStandardNodeSchema], default: [] },
  },
  { timestamps: true }
);

securityStandardSchema.index({ standardKey: 1, version: 1 }, { unique: true });
securityStandardSchema.index({ standardKey: 1 });
securityStandardSchema.index({ version: 1 });
securityStandardSchema.index({ type: 1 });
securityStandardSchema.index({ isActive: 1 });

export type SecurityStandardDocument = HydratedDocument<SecurityStandard>;

export const SecurityStandardModel = model<SecurityStandard>(
  "SecurityStandard",
  securityStandardSchema
);
