import {
  PROJECT_RESPONSIBILITY_BY_KEY,
  PROJECT_RESPONSIBILITY_REGISTRY,
  type ProjectResponsibilityKey,
} from "@role-dashboard/contracts";
import type { Permission } from "@/constants/permissions";
import { getEffectiveProjectType } from "./project.mapper";

type ProjectResponsibilitySource = Record<string, unknown> & {
  type?: unknown;
  projectType?: unknown;
};

type AssignmentResponsibilitySource = {
  projectId?: unknown;
  project?: unknown;
  userId?: unknown;
  pentester?: unknown;
  managerId?: unknown;
  manager?: unknown;
  assignmentRole?: unknown;
};

function containsUser(value: unknown, userId: string) {
  const values = Array.isArray(value) ? value : [value];
  return values.some((candidate) => String(candidate || "") === userId);
}

export function groupUserAssignmentRoles(
  assignments: readonly AssignmentResponsibilitySource[],
  userId: string
) {
  const rolesByProject = new Map<string, string[]>();
  for (const assignment of assignments) {
    const projectId = assignment.projectId || assignment.project;
    if (!projectId) continue;
    const isDirect = String(assignment.userId || assignment.pentester || "") === userId;
    const isManager = String(assignment.managerId || assignment.manager || "") === userId;
    const role = isDirect
      ? String(assignment.assignmentRole || (assignment.pentester ? "pentester" : ""))
      : isManager
        ? "manager"
        : "";
    if (!role) continue;
    const key = String(projectId);
    rolesByProject.set(key, [...new Set([...(rolesByProject.get(key) || []), role])]);
  }
  return rolesByProject;
}

export function resolveProjectResponsibilities({
  project,
  userId,
  assignmentRoles,
}: {
  project: ProjectResponsibilitySource;
  userId: string;
  assignmentRoles: readonly string[];
}): ProjectResponsibilityKey[] {
  const projectType = getEffectiveProjectType(project);
  const roleSet = new Set(assignmentRoles.filter(Boolean));

  return PROJECT_RESPONSIBILITY_REGISTRY
    .filter((definition) => {
      if (definition.projectTypes?.length &&
        (!projectType || !(definition.projectTypes as readonly string[]).includes(projectType))) {
        return false;
      }
      const hasCanonicalAssignment = definition.assignmentRoles.some((role) =>
        roleSet.has(role)
      );
      const hasLegacyAssignment = definition.legacyProjectFields?.some((field) =>
        containsUser(project[field], userId)
      );
      return hasCanonicalAssignment || hasLegacyAssignment;
    })
    .sort((left, right) => left.order - right.order)
    .map((definition) => definition.key as ProjectResponsibilityKey);
}

export function resolveResponsibilityRowActions(
  responsibilities: readonly ProjectResponsibilityKey[],
  permissions: readonly Permission[]
) {
  const permissionSet = new Set<string>(permissions);
  const actions = new Set<string>();

  for (const key of responsibilities) {
    const definition = PROJECT_RESPONSIBILITY_BY_KEY[key];
    for (const [action, requiredPermissions] of Object.entries(definition.actions)) {
      if (requiredPermissions?.some((permission) => permissionSet.has(permission))) {
        actions.add(action);
      }
    }
  }

  return actions;
}

export function resolveResponsibilityViews(
  responsibilities: readonly ProjectResponsibilityKey[],
  permissions: readonly Permission[]
) {
  const permissionSet = new Set<string>(permissions);
  return new Set(
    responsibilities.flatMap((key) => {
      const definition = PROJECT_RESPONSIBILITY_BY_KEY[key];
      return definition.readPermissions.some((permission) => permissionSet.has(permission))
        ? [...definition.projectViews]
        : [];
    })
  );
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
