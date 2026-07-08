import { z } from "zod";
import { MOBILE_ARTIFACT_TYPES, MOBILE_PLATFORMS } from "../models/projectDevOpsArtifact.model";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");
const text = (max: number) => z.string().trim().max(max).default("");
const safeUrl = text(2048).refine((value) => {
  if (!value) return true;
  try {
    const parsed = new URL(value);
    return ["http:", "https:"].includes(parsed.protocol) && !parsed.username && !parsed.password;
  } catch { return false; }
}, "downloadUrl must be HTTP(S) and must not contain embedded credentials");
const safeReference = text(2048).refine((value) => {
  if (!value) return true;
  try {
    const parsed = new URL(value);
    return !parsed.username && !parsed.password;
  } catch { return true; }
}, "fileRef must not contain embedded credentials");

const fields = {
  artifactType: z.enum(MOBILE_ARTIFACT_TYPES),
  name: z.string().trim().min(1).max(200),
  version: text(100),
  platform: z.enum(MOBILE_PLATFORMS),
  fileRef: safeReference,
  downloadUrl: safeUrl,
  checksum: text(256),
  buildNumber: text(100),
  packageName: text(300),
  bundleId: text(300),
  minOsVersion: text(100),
  deviceNotes: text(4000),
  installNotes: text(4000),
};

function validateReference(input: { artifactType?: string; fileRef?: string; downloadUrl?: string }, context: z.RefinementCtx) {
  if (input.artifactType === "download_url" && !input.downloadUrl) {
    context.addIssue({ code: "custom", path: ["downloadUrl"], message: "downloadUrl is required for a download URL artifact" });
  }
  if (input.artifactType && input.artifactType !== "download_url" && !input.fileRef && !input.downloadUrl) {
    context.addIssue({ code: "custom", path: ["fileRef"], message: "fileRef or downloadUrl is required" });
  }
}

export const mobileArtifactCreateRequestSchema = z.object(fields).strict().superRefine(validateReference);
export const mobileArtifactPatchRequestSchema = z.object(fields).partial().strict()
  .refine((input) => Object.keys(input).length > 0, "At least one field is required");
const artifactParams = z.object({ id: objectId, artifactId: objectId });
export const createMobileArtifactSchema = z.object({ params: z.object({ id: objectId }), body: mobileArtifactCreateRequestSchema });
export const patchMobileArtifactSchema = z.object({ params: artifactParams, body: mobileArtifactPatchRequestSchema });
export const mobileArtifactParamsSchema = z.object({ params: artifactParams });
