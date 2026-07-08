import { z } from "zod";
import {
  RUNTIME_INSTANCE_STATUSES,
  RUNTIME_INSTANCE_TYPES,
  TEST_TARGET_TYPES,
} from "../models/devOpsResource.model";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");
const requiredText = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) => z.string().trim().max(max).default("");
const safeUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => {
    if (!value) return true;
    try {
      const parsed = new URL(value);
      return (
        ["http:", "https:"].includes(parsed.protocol) &&
        !parsed.username &&
        !parsed.password
      );
    } catch {
      return false;
    }
  }, "URL must be HTTP(S) and must not contain embedded credentials");

export const runtimeInstanceCreateRequestSchema = z
  .object({
    assignedUserId: objectId.nullable().optional(),
    name: requiredText(200),
    type: z.enum(RUNTIME_INSTANCE_TYPES),
    status: z.enum(RUNTIME_INSTANCE_STATUSES).default("pending"),
    accessUrl: safeUrl.default(""),
    consoleUrl: safeUrl.default(""),
    host: optionalText(255),
    port: z.number().int().min(1).max(65535).nullable().optional(),
    networkNotes: optionalText(4000),
    notes: optionalText(4000),
  })
  .strict();
export const runtimeInstancePatchRequestSchema = runtimeInstanceCreateRequestSchema
  .partial()
  .refine((input) => Object.keys(input).length > 0, "At least one field is required");

export const testTargetCreateRequestSchema = z
  .object({
    runtimeInstanceId: objectId.nullable().optional(),
    name: requiredText(200),
    type: z.enum(TEST_TARGET_TYPES),
    url: safeUrl.default(""),
    version: optionalText(100),
    authRequired: z.boolean().default(false),
    notes: optionalText(4000),
  })
  .strict();
export const testTargetPatchRequestSchema = testTargetCreateRequestSchema
  .partial()
  .refine((input) => Object.keys(input).length > 0, "At least one field is required");

const projectParams = z.object({ id: objectId });
const instanceParams = z.object({ id: objectId, instanceId: objectId });
const targetParams = z.object({ id: objectId, targetId: objectId });

export const createRuntimeInstanceSchema = z.object({ params: projectParams, body: runtimeInstanceCreateRequestSchema });
export const patchRuntimeInstanceSchema = z.object({ params: instanceParams, body: runtimeInstancePatchRequestSchema });
export const runtimeInstanceParamsSchema = z.object({ params: instanceParams });
export const createTestTargetSchema = z.object({ params: projectParams, body: testTargetCreateRequestSchema });
export const patchTestTargetSchema = z.object({ params: targetParams, body: testTargetPatchRequestSchema });
export const testTargetParamsSchema = z.object({ params: targetParams });

export type RuntimeInstanceCreateRequest = z.infer<typeof runtimeInstanceCreateRequestSchema>;
export type RuntimeInstancePatchRequest = z.infer<typeof runtimeInstancePatchRequestSchema>;
export type TestTargetCreateRequest = z.infer<typeof testTargetCreateRequestSchema>;
export type TestTargetPatchRequest = z.infer<typeof testTargetPatchRequestSchema>;
