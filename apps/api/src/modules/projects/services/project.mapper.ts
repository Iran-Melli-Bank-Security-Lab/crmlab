import type { CreateProjectRequest } from "../validators/project.validators";

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
    projectManager: input.projectManagerId,
    qualityManager:
      input.qualityManagerId || (input.type === "quality" ? input.projectManagerId : undefined),
    devops: input.devopsManagerId,
    representative: input.representativeId,
    expireDay: new Date(input.testEndDate),
    testExpiresAt: new Date(input.testEndDate),
  };
}
