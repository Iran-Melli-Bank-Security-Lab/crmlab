import { z } from "zod";
import {
  PROJECT_ASSIGNMENT_ROLE_VALUES,
  PROJECT_TYPE_VALUES,
} from "@/constants/projects";
import { SECURITY_SCOPE_MODES } from "../constants/securityScope";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid user id");
const nonEmptyString = z.string().trim().min(1);
const optionalNonEmptyString = z.string().trim().min(1).optional();
const dateString = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), "Invalid test end date");

export const createProjectRequestSchema = z
  .object({
    projectName: z.string().trim().min(2),
    sourceProjectId: objectId.optional(),
    projectGroupId: optionalNonEmptyString,
    canonicalName: optionalNonEmptyString,
    version: nonEmptyString,
    letterNumber: nonEmptyString,
    type: z.enum(PROJECT_TYPE_VALUES),
    platform: nonEmptyString,
    certificateRequired: z.boolean(),
    certificateAuthorities: z.array(nonEmptyString),
    projectManagerId: objectId.optional(),
    qualityManagerId: objectId.optional(),
    devopsManagerId: objectId,
    representativeId: objectId,
    testEndDate: dateString,
  })
  .superRefine((input, context) => {
    if (input.certificateRequired && input.certificateAuthorities.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["certificateAuthorities"],
        message: "At least one certificate authority is required",
      });
    }
    if (input.type === "security" && !input.projectManagerId) {
      context.addIssue({
        code: "custom",
        path: ["projectManagerId"],
        message: "A Security Project Manager is required for a security project",
      });
    }
    if (input.type === "quality" && !input.qualityManagerId) {
      context.addIssue({
        code: "custom",
        path: ["qualityManagerId"],
        message: "A Quality Project Manager is required for a quality project",
      });
    }
    if (input.type === "security" && input.qualityManagerId) {
      context.addIssue({
        code: "custom",
        path: ["qualityManagerId"],
        message: "A Quality Project Manager cannot manage a security project",
      });
    }
    if (input.type === "quality" && input.projectManagerId) {
      context.addIssue({
        code: "custom",
        path: ["projectManagerId"],
        message: "A Security Project Manager cannot manage a quality project",
      });
    }
  });

export type CreateProjectRequest = z.infer<typeof createProjectRequestSchema>;

export const createProjectSchema = z.object({
  body: createProjectRequestSchema,
});

export const securityScopeReferenceSchema = z
  .object({
    standardKey: z.string().trim().min(1).max(80),
    standardVersion: z.string().trim().min(1).max(40),
    scopeMode: z.enum(SECURITY_SCOPE_MODES),
    selectedNodeIds: z.array(z.string().trim().min(1)).default([]),
  })
  .strict();

export const projectSecurityScopeSchema = z.object({
  body: securityScopeReferenceSchema,
});

export const assignUsersRequestSchema = z
  .object({
    userIds: z.array(objectId),
    role: z.enum(PROJECT_ASSIGNMENT_ROLE_VALUES).default("pentester"),
    pentesterScopes: z
      .array(
        z
          .object({
            userId: objectId,
            securityScope: securityScopeReferenceSchema,
          })
          .strict()
      )
      .optional(),
  })
  .strict()
  .superRefine((input, context) => {
    const userIds = new Set(input.userIds);
    const scopedUserIds = new Set<string>();
    for (const assignment of input.pentesterScopes || []) {
      if (scopedUserIds.has(assignment.userId)) {
        context.addIssue({
          code: "custom",
          path: ["pentesterScopes"],
          message: "Duplicate pentester scope userId",
        });
      }
      if (!userIds.has(assignment.userId)) {
        context.addIssue({
          code: "custom",
          path: ["pentesterScopes"],
          message: "Pentester scope userId must be included in userIds",
        });
      }
      scopedUserIds.add(assignment.userId);
    }
    if (input.pentesterScopes?.length && input.role !== "pentester") {
      context.addIssue({
        code: "custom",
        path: ["pentesterScopes"],
        message: "Security scopes are only supported for pentester assignments",
      });
    }
  });

export const assignUsersSchema = z.object({
  body: assignUsersRequestSchema,
});

export type AssignUsersRequest = z.infer<typeof assignUsersRequestSchema>;

const provisioningNotes = z.string().trim().max(5000).optional();

export const provisioningStartSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({ notes: provisioningNotes }).strict(),
});

export const provisioningReadySchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({ notes: provisioningNotes }).strict(),
});

export const provisioningBlockedSchema = z.object({
  params: z.object({ id: objectId }),
  body: z
    .object({
      failureReason: z.string().trim().min(1, "Failure reason is required").max(500),
      technicalDescription: z.string().trim().min(1).max(10000),
      recommendedAction: z.string().trim().max(5000).optional(),
      evidence: z.array(z.string().trim().min(1).max(1000)).max(20).optional(),
    })
    .strict(),
});

export const provisioningRetrySchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({ notes: provisioningNotes }).strict(),
});
