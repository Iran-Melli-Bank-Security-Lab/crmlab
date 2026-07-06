import { HTTP_STATUS } from "@/constants/http";
import { PROJECT_TYPES } from "@/constants/projects";
import {
  collectSecurityStandardNodeIds,
  findActiveSecurityStandardForType,
  listActiveSecurityStandardsByType,
  validateSelectedSecurityStandardNodeIds,
} from "@/modules/security-standards/services/securityStandard.service";
import type {
  SecurityStandardNode,
  SecurityStandardType,
} from "@/modules/security-standards/models/securityStandard.model";
import { AppError } from "@/utils/AppError";
import {
  DEFAULT_WEB_SECURITY_STANDARD,
  PROJECT_SECURITY_TARGET_TYPES,
  type ProjectSecurityTargetType,
  type SecurityScopeReference,
} from "../constants/securityScope";
import { ProjectModel, type ProjectDocument } from "../models/project.model";
import { ProjectAssignmentModel } from "../models/projectAssignment.model";
import {
  ProjectSecurityScopeModel,
  type ProjectSecurityScopeDocument,
} from "../models/projectSecurityScope.model";

type ProjectPlatformSource = Pick<ProjectDocument, "type" | "platform">;

export function getProjectSecurityTargetType(
  project: ProjectPlatformSource
): ProjectSecurityTargetType {
  const platform = project.platform?.[0]?.trim().toLowerCase();
  if (
    platform &&
    (PROJECT_SECURITY_TARGET_TYPES as readonly string[]).includes(platform)
  ) {
    return platform as ProjectSecurityTargetType;
  }

  return project.type === PROJECT_TYPES.SECURITY ? "web" : "other";
}

async function requireSecurityProject(projectId: string) {
  const project = await ProjectModel.findById(projectId);
  if (!project) {
    throw new AppError("Project not found", HTTP_STATUS.NOT_FOUND);
  }
  if (project.type !== PROJECT_TYPES.SECURITY) {
    throw new AppError(
      "Security scope is only available for security projects",
      HTTP_STATUS.BAD_REQUEST
    );
  }
  return project;
}

async function getStandardForProject(
  project: ProjectPlatformSource,
  requested?: Pick<SecurityScopeReference, "standardKey" | "standardVersion">
) {
  const targetType = getProjectSecurityTargetType(project);
  const defaultStandard =
    !requested && targetType === "web" ? DEFAULT_WEB_SECURITY_STANDARD : undefined;
  const standard = await findActiveSecurityStandardForType({
    type: targetType as SecurityStandardType,
    standardKey: requested?.standardKey || defaultStandard?.standardKey,
    version: requested?.standardVersion || defaultStandard?.standardVersion,
  });
  return { standard, targetType };
}

function normalizeScopeReference(
  scope: SecurityScopeReference,
  nodes: readonly SecurityStandardNode[]
): SecurityScopeReference {
  if (scope.scopeMode !== "all" && scope.scopeMode !== "custom") {
    throw new AppError("Invalid security scope mode", HTTP_STATUS.BAD_REQUEST);
  }
  const requestedNodeIds = scope.selectedNodeIds.map((nodeId) => nodeId.trim());
  validateSelectedSecurityStandardNodeIds(nodes, requestedNodeIds);
  const selectedNodeIds = scope.scopeMode === "all" ? [] : requestedNodeIds;
  return { ...scope, selectedNodeIds: [...selectedNodeIds] };
}

export async function validateProjectSecurityScope(
  projectId: string,
  scope: SecurityScopeReference
) {
  const project = await requireSecurityProject(projectId);
  const { standard, targetType } = await getStandardForProject(project, scope);
  return {
    targetType,
    ...normalizeScopeReference(
      {
        ...scope,
        standardKey: standard.standardKey,
        standardVersion: standard.version,
      },
      standard.nodes
    ),
  };
}

export async function listProjectSecurityStandards(projectId: string) {
  const project = await requireSecurityProject(projectId);
  const targetType = getProjectSecurityTargetType(project);
  const standards = await listActiveSecurityStandardsByType(
    targetType as SecurityStandardType
  );
  return { targetType, standards };
}

export async function getResolvedProjectSecurityScope(
  projectId: string,
  actorUserId: string
) {
  const scope = await getOrCreateDefaultProjectSecurityScope(projectId, actorUserId);
  if (!scope) {
    throw new AppError(
      "Project security scope could not be created",
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
  const project = await requireSecurityProject(projectId);
  const { standard } = await getStandardForProject(project, {
    standardKey: scope.standardKey,
    standardVersion: scope.standardVersion,
  });
  return {
    scope,
    effectiveSelectedNodeIds:
      scope.scopeMode === "all"
        ? collectSecurityStandardNodeIds(standard.nodes)
        : [...scope.selectedNodeIds],
  };
}

export async function saveProjectSecurityScope(
  projectId: string,
  input: SecurityScopeReference,
  actorUserId: string
) {
  const normalized = await validateProjectSecurityScope(projectId, input);
  const assignments = await ProjectAssignmentModel.find({
    projectId,
    assignmentRole: "pentester",
    securityScope: { $exists: true },
  }).select("securityScope");

  const projectNodeIds = new Set(normalized.selectedNodeIds);
  const incompatibleAssignment = assignments.find((assignment) => {
    const scope = assignment.securityScope;
    if (!scope) return false;
    if (
      scope.standardKey !== normalized.standardKey ||
      scope.standardVersion !== normalized.standardVersion
    ) {
      return true;
    }
    if (normalized.scopeMode === "all") return false;
    if (scope.scopeMode === "all") return true;
    return scope.selectedNodeIds.some((nodeId) => !projectNodeIds.has(nodeId));
  });
  if (incompatibleAssignment) {
    throw new AppError(
      "Project scope conflicts with an existing pentester scope",
      HTTP_STATUS.CONFLICT
    );
  }

  const saved = await ProjectSecurityScopeModel.findOneAndUpdate(
    { projectId },
    {
      $set: {
        targetType: normalized.targetType,
        standardKey: normalized.standardKey,
        standardVersion: normalized.standardVersion,
        scopeMode: normalized.scopeMode,
        selectedNodeIds: normalized.selectedNodeIds,
        updatedBy: actorUserId,
      },
      $setOnInsert: { projectId, createdBy: actorUserId },
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );
  if (!saved) {
    throw new AppError(
      "Project security scope could not be saved",
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
  return saved;
}

export async function getOrCreateDefaultProjectSecurityScope(
  projectId: string,
  actorUserId: string
) {
  const existing = await ProjectSecurityScopeModel.findOne({ projectId });
  if (existing) return existing;

  const project = await requireSecurityProject(projectId);
  const { standard, targetType } = await getStandardForProject(project);
  return ProjectSecurityScopeModel.findOneAndUpdate(
    { projectId },
    {
      $setOnInsert: {
        projectId,
        targetType,
        standardKey: standard.standardKey,
        standardVersion: standard.version,
        scopeMode: "all",
        selectedNodeIds: [],
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
}

export async function resolvePentesterSecurityScope(
  projectScope: ProjectSecurityScopeDocument,
  requestedScope?: SecurityScopeReference
): Promise<SecurityScopeReference> {
  const projectScopeReference: SecurityScopeReference = {
    standardKey: projectScope.standardKey,
    standardVersion: projectScope.standardVersion,
    scopeMode: projectScope.scopeMode,
    selectedNodeIds: [...projectScope.selectedNodeIds],
  };
  if (!requestedScope) return projectScopeReference;

  if (
    requestedScope.standardKey !== projectScope.standardKey ||
    requestedScope.standardVersion !== projectScope.standardVersion
  ) {
    throw new AppError(
      "Pentester scope must use the project security standard",
      HTTP_STATUS.BAD_REQUEST
    );
  }

  const project = await requireSecurityProject(String(projectScope.projectId));
  const { standard } = await getStandardForProject(project, requestedScope);
  const normalized = normalizeScopeReference(
    {
      ...requestedScope,
      standardKey: standard.standardKey,
      standardVersion: standard.version,
    },
    standard.nodes
  );

  if (projectScope.scopeMode === "custom") {
    if (normalized.scopeMode === "all") {
      throw new AppError(
        "Pentester scope cannot exceed the custom project scope",
        HTTP_STATUS.BAD_REQUEST
      );
    }
    const projectNodeIds = new Set(projectScope.selectedNodeIds);
    const outsideProjectScope = normalized.selectedNodeIds.find(
      (nodeId) => !projectNodeIds.has(nodeId)
    );
    if (outsideProjectScope) {
      throw new AppError(
        `Pentester scope node is outside project scope: ${outsideProjectScope}`,
        HTTP_STATUS.BAD_REQUEST
      );
    }
  }

  return normalized;
}
