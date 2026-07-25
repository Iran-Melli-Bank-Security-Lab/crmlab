import {
  PROJECT_CAPABILITY_KEYS,
  PROJECT_RESPONSIBILITY_BY_KEY,
  PROJECT_RESPONSIBILITY_REGISTRY,
  type ProjectResponsibilityContextContract,
  type ProjectResponsibilityDefinition,
  type ProjectResponsibilityKey,
} from "@role-dashboard/contracts";
import { HTTP_STATUS } from "@/constants/http";
import type { Permission } from "@/constants/permissions";
import { AppError } from "@/utils/AppError";
import { getEffectiveProjectType } from "./project.mapper";

export type ProjectResponsibilityAssignmentSource = {
  projectId?: unknown;
  project?: unknown;
  userId?: unknown;
  pentester?: unknown;
  assignmentRole?: unknown;
  status?: unknown;
};

type ProjectResponsibilitySource = Record<string, unknown> & {
  type?: unknown;
  projectType?: unknown;
};

function containsUser(value: unknown, userId: string) {
  const values = Array.isArray(value) ? value : [value];
  return values.some((candidate) => String(candidate || "") === userId);
}

function appliesToProject(
  definition: ProjectResponsibilityDefinition,
  projectType?: string
) {
  return !definition.projectTypes?.length ||
    Boolean(projectType && definition.projectTypes.includes(projectType));
}

function hasModernAssignment(
  definition: ProjectResponsibilityDefinition,
  assignments: readonly ProjectResponsibilityAssignmentSource[],
  userId: string
) {
  return assignments.some((assignment) =>
    assignment.status !== "removed" &&
    String(assignment.userId || "") === userId &&
    definition.assignmentRoles.includes(String(assignment.assignmentRole || ""))
  );
}

function hasRemovedModernAssignment(
  definition: ProjectResponsibilityDefinition,
  assignments: readonly ProjectResponsibilityAssignmentSource[],
  userId: string
) {
  return assignments.some((assignment) =>
    assignment.status === "removed" &&
    String(assignment.userId || assignment.pentester || "") === userId &&
    definition.assignmentRoles.includes(String(assignment.assignmentRole || ""))
  );
}

function hasLegacyProjectUserAssignment(
  definition: ProjectResponsibilityDefinition,
  assignments: readonly ProjectResponsibilityAssignmentSource[],
  userId: string
) {
  if (!definition.legacyAssignmentUserFields?.length) return false;
  return assignments.some((assignment) =>
    assignment.status !== "removed" &&
    !assignment.userId &&
    (!assignment.assignmentRole ||
      definition.assignmentRoles.includes(String(assignment.assignmentRole))) &&
    definition.legacyAssignmentUserFields?.some((field) =>
      containsUser(assignment[field as keyof ProjectResponsibilityAssignmentSource], userId)
    )
  );
}

function hasExplicitProjectAssignment(
  definition: ProjectResponsibilityDefinition,
  project: ProjectResponsibilitySource,
  userId: string
) {
  return definition.projectAssignmentFields?.some((field) =>
    containsUser(project[field], userId)
  ) || false;
}

function hasAuthoritativeAssignmentEvidence({
  project,
  userId,
  assignments,
  projectType,
}: {
  project: ProjectResponsibilitySource;
  userId: string;
  assignments: readonly ProjectResponsibilityAssignmentSource[];
  projectType?: string;
}) {
  return PROJECT_RESPONSIBILITY_REGISTRY.some((definition) =>
    appliesToProject(definition, projectType) &&
    (hasModernAssignment(definition, assignments, userId) ||
      hasLegacyProjectUserAssignment(definition, assignments, userId) ||
      hasExplicitProjectAssignment(definition, project, userId))
  );
}

export function resolveProjectResponsibilityContext({
  user,
  project,
  assignments,
}: {
  user: { id: string; permissions: readonly Permission[] };
  project: ProjectResponsibilitySource;
  assignments: readonly ProjectResponsibilityAssignmentSource[];
}): ProjectResponsibilityContextContract {
  const projectType = getEffectiveProjectType(project);
  const hasAuthoritativeEvidence = hasAuthoritativeAssignmentEvidence({
    project,
    userId: user.id,
    assignments,
    projectType,
  });
  const resolved = PROJECT_RESPONSIBILITY_REGISTRY.filter((definition) => {
    if (!appliesToProject(definition, projectType)) return false;
    if (hasModernAssignment(definition, assignments, user.id)) return true;
    if (hasLegacyProjectUserAssignment(definition, assignments, user.id)) return true;
    if (
      hasExplicitProjectAssignment(definition, project, user.id) &&
      !hasRemovedModernAssignment(definition, assignments, user.id)
    ) return true;
    return !hasAuthoritativeEvidence &&
      Boolean(definition.legacyFallbackProjectFields?.some((field) =>
        containsUser(project[field], user.id)
      ));
  }).sort((left, right) => left.order - right.order);

  const responsibilityKeys = resolved.map(
    (definition) => definition.key as ProjectResponsibilityKey
  );
  const assignmentsByKey = Object.fromEntries(
    PROJECT_RESPONSIBILITY_REGISTRY.map((definition) => [
      definition.key,
      responsibilityKeys.includes(definition.key as ProjectResponsibilityKey),
    ])
  ) as ProjectResponsibilityContextContract["assignments"];
  const permissionSet = new Set<string>(user.permissions);
  const capabilities = Object.fromEntries(
    PROJECT_CAPABILITY_KEYS.map((capability) => [
      capability,
      resolved.some((definition) =>
        definition.capabilities[capability]?.some((permission) =>
          permissionSet.has(permission)
        )
      ),
    ])
  ) as ProjectResponsibilityContextContract["capabilities"];

  return {
    responsibilityKeys,
    assignments: assignmentsByKey,
    capabilities,
  };
}

export function resolveResponsibilityViews(
  context: ProjectResponsibilityContextContract,
  permissions: readonly Permission[]
) {
  const permissionSet = new Set<string>(permissions);
  return new Set(
    context.responsibilityKeys.flatMap((key) => {
      const definition = PROJECT_RESPONSIBILITY_BY_KEY[key];
      return definition.readPermissions.some((permission) => permissionSet.has(permission))
        ? [...PROJECT_RESPONSIBILITY_BY_KEY[key].projectViews]
        : [];
    })
  );
}

export function assertProjectCapability(
  context: ProjectResponsibilityContextContract,
  capability: keyof ProjectResponsibilityContextContract["capabilities"]
) {
  if (!context.capabilities[capability]) {
    throw new AppError(
      "Forbidden: required project assignment is missing",
      HTTP_STATUS.FORBIDDEN
    );
  }
}

/**
 * Visibility helper only. It deliberately does not resolve responsibilities or
 * capabilities because project visibility is a separate authorization concern.
 */
export function groupDirectAssignmentRolesForVisibility(
  assignments: readonly ProjectResponsibilityAssignmentSource[],
  userId: string
) {
  const rolesByProject = new Map<string, string[]>();
  const legacyPentesterDefinition = PROJECT_RESPONSIBILITY_REGISTRY.find((definition) =>
    definition.legacyAssignmentUserFields?.includes("pentester")
  );
  for (const assignment of assignments) {
    if (assignment.status === "removed") continue;
    const projectId = assignment.projectId || assignment.project;
    if (!projectId) continue;
    const modernRole = String(assignment.userId || "") === userId
      ? String(assignment.assignmentRole || "")
      : "";
    const legacyRole = !assignment.userId &&
      String(assignment.pentester || "") === userId &&
      (!assignment.assignmentRole || legacyPentesterDefinition?.assignmentRoles.includes(
        String(assignment.assignmentRole)
      ))
      ? legacyPentesterDefinition?.assignmentRoles[0] || ""
      : "";
    const role = modernRole || legacyRole;
    if (!role) continue;
    const key = String(projectId);
    rolesByProject.set(key, [...new Set([...(rolesByProject.get(key) || []), role])]);
  }
  return rolesByProject;
}

export function getResponsibilityProjectIdsByView(
  assignments: ReadonlyMap<string, readonly string[]>,
  view: string
) {
  const acceptedRoles = new Set(
    PROJECT_RESPONSIBILITY_REGISTRY
      .filter((definition) => definition.projectViews.includes(view))
      .flatMap((definition) => definition.assignmentRoles)
  );
  return new Set(
    [...assignments.entries()].flatMap(([projectId, roles]) =>
      roles.some((role) => acceptedRoles.has(role)) ? [projectId] : []
    )
  );
}
