import { z } from "zod";
import {
  DEVOPS_CREDENTIAL_SCOPES,
  DEVOPS_CREDENTIAL_TYPES,
} from "../models/devOpsCredentialGroup.model";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");
const text = (max: number) => z.string().trim().max(max).default("");
const accountSchema = z.object({
  label: z.string().trim().min(1).max(120),
  role: text(120),
  username: text(300),
  password: z.string().max(2000).default(""),
  token: z.string().max(8000).default(""),
  notes: text(2000),
}).strict();

const groupFields = {
  name: z.string().trim().min(1).max(200),
  type: z.enum(DEVOPS_CREDENTIAL_TYPES),
  scope: z.enum(DEVOPS_CREDENTIAL_SCOPES),
  targetIds: z.array(objectId).max(200).default([]),
  instanceIds: z.array(objectId).max(200).default([]),
  visibleToUserIds: z.array(objectId).max(500).default([]),
  accounts: z.array(accountSchema).max(100).default([]),
};

function uniqueAccountLabels(input: { accounts?: Array<{ label: string }> }, context: z.RefinementCtx) {
  const labels = (input.accounts || []).map((account) => account.label.toLocaleLowerCase());
  if (new Set(labels).size !== labels.length) {
    context.addIssue({ code: "custom", path: ["accounts"], message: "Account labels must be unique within a group" });
  }
}

export const credentialGroupCreateRequestSchema = z.object(groupFields).strict().superRefine(uniqueAccountLabels);
export const credentialGroupPatchRequestSchema = z.object(groupFields).partial().strict()
  .refine((input) => Object.keys(input).length > 0, "At least one field is required")
  .superRefine(uniqueAccountLabels);

const params = z.object({ id: objectId, groupId: objectId });
export const createCredentialGroupSchema = z.object({
  params: z.object({ id: objectId }), body: credentialGroupCreateRequestSchema,
});
export const patchCredentialGroupSchema = z.object({ params, body: credentialGroupPatchRequestSchema });
export const credentialGroupParamsSchema = z.object({ params });

export type CredentialGroupCreateRequest = z.infer<typeof credentialGroupCreateRequestSchema>;
export type CredentialGroupPatchRequest = z.infer<typeof credentialGroupPatchRequestSchema>;
