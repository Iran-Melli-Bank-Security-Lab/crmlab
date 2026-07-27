import type { CreateProjectRequest } from "../validators/project.validators";
import {
  PROJECT_TYPE_VALUES,
  type ProjectType,
} from "@/constants/projects";

type ProjectTypeSource = {
  type?: unknown;
  projectType?: unknown;
};

export function getEffectiveProjectType(
  project: ProjectTypeSource
): ProjectType | undefined {
  const legacyTypes = Array.isArray(project.projectType)
    ? project.projectType
    : [project.projectType];
  const candidates = [project.type, ...legacyTypes];

  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;

    const normalized = candidate.trim().toLowerCase();
    if ((PROJECT_TYPE_VALUES as readonly string[]).includes(normalized)) {
      return normalized as ProjectType;
    }
  }

  return undefined;
}

export function mapCreateProjectRequest(input: CreateProjectRequest) {
  return {
    projectName: input.projectName,
    projectGroupId: input.projectGroupId,
    canonicalName: input.canonicalName,
    version: input.version,
    letterNumber: input.letterNumber,
    type: input.type,
    platform: [input.platform],
    certificateRequired: input.certificateRequired,
    certificateAuthorities: input.certificateRequired
      ? Array.from(new Set(input.certificateAuthorities))
      : [],
    projectManager:
      input.type === "security" ? input.projectManagerId : input.qualityManagerId,
    qualityManager: input.type === "quality" ? input.qualityManagerId : undefined,
    devops: input.devopsManagerId,
    representative: input.representativeId,
    expireDay: new Date(input.testEndDate),
    testExpiresAt: new Date(input.testEndDate),
  };
}
