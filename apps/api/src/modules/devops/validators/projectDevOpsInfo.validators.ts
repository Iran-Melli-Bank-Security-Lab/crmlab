import { z } from "zod";
import {
  DEVOPS_ARTIFACT_TYPES,
  DEVOPS_DELIVERY_MODES,
  DEVOPS_PROVISIONING_STATUSES,
  DEVOPS_SETUP_TYPES,
  DELIVERY_MODE_TO_SETUP_TYPE,
  SETUP_TYPE_TO_DELIVERY_MODE,
  type DevOpsSetupType,
} from "../models/projectDevOpsInfo.model";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid project id");
const text = (max: number) => z.string().trim().max(max).default("");
const safeLocation = (max: number) => text(max).refine((value) => {
  if (!value) return true;
  try {
    const parsed = new URL(value);
    return !parsed.username && !parsed.password;
  } catch {
    return true;
  }
}, "URLs must not contain embedded credentials");

export const ARTIFACT_TYPES_BY_SETUP: Record<DevOpsSetupType, readonly string[]> = {
  virtualized_environment: ["ovf", "ova", "file", "download_url"],
  containerized_environment: ["docker_image", "docker_compose", "repository", "download_url"],
  mobile_app: ["apk", "ipa", "file", "download_url"],
  external_client_environment: ["none", "download_url", "other"],
  direct_installation: ["file", "repository", "download_url", "other"],
  none: ["none"],
  other: ["file", "download_url", "repository", "other", "none"],
};

export const projectDevOpsInfoRequestSchema = z
  .object({
    linkedDevOpsProjectId: objectId.nullable().optional(),
    setupType: z.enum(DEVOPS_SETUP_TYPES).optional(),
    deliveryMode: z.enum(DEVOPS_DELIVERY_MODES).optional(),
    provisioningStatus: z.enum(DEVOPS_PROVISIONING_STATUSES),
    sourceArtifact: z
      .object({
        type: z.enum(DEVOPS_ARTIFACT_TYPES).default("none"),
        name: text(200),
        version: text(100),
        location: safeLocation(2048),
        checksum: text(256),
        notes: text(4000),
      })
      .strict()
      .default({
        type: "none",
        name: "",
        version: "",
        location: "",
        checksum: "",
        notes: "",
      }),
    environment: z
      .object({
        environmentName: text(200),
        accessUrl: safeLocation(2048),
        repositoryUrl: safeLocation(2048),
        branch: text(255),
        pipelineUrl: safeLocation(2048),
        networkNotes: text(4000),
      })
      .strict()
      .default({
        environmentName: "",
        accessUrl: "",
        repositoryUrl: "",
        branch: "",
        pipelineUrl: "",
        networkNotes: "",
      }),
    notes: text(8000),
    blockers: text(8000),
  })
  .strict()
  .superRefine((input, context) => {
    if (!input.setupType && !input.deliveryMode) {
      context.addIssue({ code: "custom", path: ["setupType"], message: "setupType or legacy deliveryMode is required" });
      return;
    }
    const setupType = input.setupType || DELIVERY_MODE_TO_SETUP_TYPE[input.deliveryMode!];
    if (
      input.setupType &&
      input.deliveryMode &&
      SETUP_TYPE_TO_DELIVERY_MODE[input.setupType] !== input.deliveryMode
    ) {
      context.addIssue({ code: "custom", path: ["deliveryMode"], message: "deliveryMode does not match setupType" });
    }
    if (!ARTIFACT_TYPES_BY_SETUP[setupType].includes(input.sourceArtifact.type)) {
      context.addIssue({
        code: "custom",
        path: ["sourceArtifact", "type"],
        message: `Artifact type ${input.sourceArtifact.type} is not valid for setupType ${setupType}`,
      });
    }
  });

export const projectDevOpsInfoSchema = z.object({
  params: z.object({ id: objectId }),
  body: projectDevOpsInfoRequestSchema,
});

export type ProjectDevOpsInfoRequest = z.infer<typeof projectDevOpsInfoRequestSchema>;
