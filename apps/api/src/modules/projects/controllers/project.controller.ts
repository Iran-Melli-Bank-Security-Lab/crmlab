import type { RequestHandler } from "express";
import mongoose, { type QueryFilter } from "mongoose";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "@/constants/audit";
import { HTTP_STATUS } from "@/constants/http";
import { NOTIFICATION_PRIORITIES, NOTIFICATION_TYPES } from "@/constants/notifications";
import { PERMISSIONS } from "@/constants/permissions";
import {
  PROJECT_ASSIGNMENT_ROLES,
  PROJECT_ASSIGNMENT_STATUS,
  PROJECT_PROVISIONING_STATUS,
  PROJECT_STATUS,
  PROJECT_TYPES,
  type ProjectAssignmentRole,
  type ProjectType,
} from "@/constants/projects";
import { ROLES } from "@/constants/roles";
import type { Role } from "@/constants/roles";
import { ProjectModel, type ProjectDocument } from "../models/project.model";
import { ProjectAssignmentModel } from "../models/projectAssignment.model";
import { UserModel } from "@/modules/users/models/user.model";
import {
  getProjectFindingCounts,
  resolveVisibleProjectFindingCount,
} from "@/modules/pentest/services/projectFindingCount.service";
import { toAuthUserContext } from "@/modules/users/services/userAuth.service";
import { writeAuditLog } from "@/modules/audit/services/audit.service";
import { addConnectedUsersToProject, emitToProject } from "@/realtime/socket.delivery";
import { SOCKET_EVENTS } from "@/constants/socket";
import { AppError } from "@/utils/AppError";
import { sendSuccess } from "@/utils/response";
import {
  getEffectiveProjectType,
  mapCreateProjectRequest,
} from "../services/project.mapper";
import {
  NON_ADMIN_PROJECT_VIEWS,
  assertProjectAssignmentActionAllowed,
  requireProjectListView,
  resolveProjectListQueryCapabilities,
  resolveProjectRowSourceFields,
  resolveProjectRowActions,
  type NonAdminProjectView,
} from "../services/projectTableCapability.service";
import {
  assignUsersRequestSchema,
  createProjectRequestSchema,
  securityScopeReferenceSchema,
} from "../validators/project.validators";
import {
  getOrCreateDefaultProjectSecurityScope,
  getResolvedProjectSecurityScope,
  listProjectSecurityStandards,
  resolvePentesterSecurityScope,
  saveProjectSecurityScope,
} from "../services/projectSecurityScope.service";
import { notifyProjectAssignments } from "../services/projectAssignmentNotification.service";
import { createNotifications } from "@/modules/notifications/services/notification.service";
import {
  closeProjectAssignmentWorkTimers,
  reopenDeadlineClosedAssignment,
  reopenDeadlineClosedAssignments,
  toPentesterTableStatus,
  toProjectAssignmentWorkTimerSnapshot,
} from "../services/projectAssignmentWorkTimer.service";
import {
  getEffectiveProvisioningStatus,
  assertProjectOpenForWork,
  closeExpiredProjects,
  getApprovedIndividualDeadline,
  getProjectDeadline,
  notifyInitialDevopsAssignment,
} from "../services/projectProvisioning.service";
import {
  getResponsibilityProjectIdsByView,
  groupDirectAssignmentRolesForVisibility,
  resolveProjectResponsibilityContext,
  resolveResponsibilityViews,
  type ProjectResponsibilityAssignmentSource,
} from "../services/projectResponsibility.service";

type ProjectRecipientField =
  | "projectManager"
  | "qualityManager"
  | "devops"
  | "representative";
type ProjectAssignableRole = ProjectAssignmentRole;

function findPentesterAssignment(
  assignments: readonly ProjectResponsibilityAssignmentSource[],
  userId: string
) {
  return assignments.find((assignment) =>
    String(assignment.userId || assignment.pentester || "") === userId &&
    (assignment.assignmentRole === PROJECT_ASSIGNMENT_ROLES.PENTESTER ||
      (!assignment.assignmentRole && assignment.pentester))
  );
}

const recipientRules: Record<
  ProjectRecipientField,
  { label: string; roles?: readonly Role[] }
> = {
  projectManager: {
    label: "project manager",
    roles: [ROLES.PROJECT_MANAGER_SECURITY],
  },
  qualityManager: {
    label: "quality manager",
    roles: [ROLES.PROJECT_MANAGER_QA],
  },
  devops: { label: "DevOps", roles: [ROLES.DEVOPS] },
  representative: { label: "representative", roles: [ROLES.REPRESENTATIVE] },
};
const assignableRoleRules: Record<
  ProjectAssignableRole,
  { label: string; roles: readonly Role[] }
> = {
  [PROJECT_ASSIGNMENT_ROLES.PENTESTER]: { label: "pentester", roles: [ROLES.PENTESTER] },
  [PROJECT_ASSIGNMENT_ROLES.QA]: { label: "QA engineer", roles: [ROLES.QA] },
  [PROJECT_ASSIGNMENT_ROLES.DEVOPS]: { label: "DevOps engineer", roles: [ROLES.DEVOPS] },
  [PROJECT_ASSIGNMENT_ROLES.MANAGER]: {
    label: "technical manager",
    roles: [ROLES.PROJECT_MANAGER_SECURITY, ROLES.PROJECT_MANAGER_QA],
  },
  [PROJECT_ASSIGNMENT_ROLES.SECURITY_MANAGER]: {
    label: "security manager",
    roles: [ROLES.PROJECT_MANAGER_SECURITY, ROLES.PENTESTER],
  },
  [PROJECT_ASSIGNMENT_ROLES.QUALITY_MANAGER]: {
    label: "quality manager",
    roles: [ROLES.PROJECT_MANAGER_QA, ROLES.QA],
  },
  [PROJECT_ASSIGNMENT_ROLES.DEVOPS_MANAGER]: {
    label: "DevOps manager",
    roles: [ROLES.DEVOPS],
  },
  [PROJECT_ASSIGNMENT_ROLES.REPRESENTATIVE]: {
    label: "Lab Representative",
    roles: [ROLES.REPRESENTATIVE],
  },
};

function userHasAnyRole(
  user: {
    roles?: readonly Role[];
    devOps?: boolean;
    security?: boolean;
    qualityAssurance?: boolean;
  },
  roles: readonly Role[]
) {
  const effectiveRoles = new Set<Role>(user.roles || []);
  if (user.devOps) effectiveRoles.add(ROLES.DEVOPS);
  if (user.security) effectiveRoles.add(ROLES.PENTESTER);
  if (user.qualityAssurance) effectiveRoles.add(ROLES.QA);

  return roles.some((role) => effectiveRoles.has(role));
}

async function validateProjectRecipients(
  recipients: Partial<Record<ProjectRecipientField, string>>
): Promise<void> {
  const entries = Object.entries(recipients).filter(
    (entry): entry is [ProjectRecipientField, string] => Boolean(entry[1])
  );
  const userIds = Array.from(new Set(entries.map(([, userId]) => userId)));
  if (!userIds.length) return;

  const users = await UserModel.find({ _id: { $in: userIds }, isActive: true })
    .select("_id roles devOps security qualityAssurance")
    .lean();
  const usersById = new Map(users.map((user) => [String(user._id), user]));

  for (const [field, userId] of entries) {
    const user = usersById.get(userId);
    if (!user) {
      throw new AppError(
        `Assigned ${recipientRules[field].label} was not found`,
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const effectiveRoles = new Set<Role>(user.roles);
    if (user.devOps) effectiveRoles.add(ROLES.DEVOPS);
    if (user.security) effectiveRoles.add(ROLES.PENTESTER);
    if (user.qualityAssurance) effectiveRoles.add(ROLES.QA);

    const requiredRoles = recipientRules[field].roles;
    const hasRequiredRole =
      !requiredRoles || requiredRoles.some((role) => effectiveRoles.has(role));
    if (!hasRequiredRole) {
      throw new AppError(
        `Assigned ${recipientRules[field].label} does not have the required role`,
        HTTP_STATUS.BAD_REQUEST
      );
    }
  }
}

function buildInitialProjectAssignments({
  assignedById,
  projectId,
  projectManagerId,
  qualityManagerId,
  devopsManagerId,
  representativeId,
  projectType,
  version,
}: {
  assignedById: string;
  projectId: string;
  projectManagerId?: string;
  qualityManagerId?: string;
  devopsManagerId?: string;
  representativeId?: string;
  projectType?: string | null;
  version?: string | null;
}) {
  const assignmentPairs: Array<{
    userId: string;
    assignmentRole: ProjectAssignableRole;
  }> = [];

  if (projectType === PROJECT_TYPES.SECURITY && projectManagerId) {
    assignmentPairs.push({
      userId: projectManagerId,
      assignmentRole: PROJECT_ASSIGNMENT_ROLES.SECURITY_MANAGER,
    });
  }

  if (projectType === PROJECT_TYPES.QUALITY && qualityManagerId) {
    assignmentPairs.push({
      userId: qualityManagerId,
      assignmentRole: PROJECT_ASSIGNMENT_ROLES.QUALITY_MANAGER,
    });
  }

  if (devopsManagerId) {
    assignmentPairs.push({
      userId: devopsManagerId,
      assignmentRole: PROJECT_ASSIGNMENT_ROLES.DEVOPS_MANAGER,
    });
  }
  if (representativeId) {
    assignmentPairs.push({
      userId: representativeId,
      assignmentRole: PROJECT_ASSIGNMENT_ROLES.REPRESENTATIVE,
    });
  }

  const seenAssignments = new Set<string>();
  const managerId = projectManagerId || qualityManagerId;

  return assignmentPairs
    .filter(({ userId, assignmentRole }) => {
      const key = `${userId}:${assignmentRole}`;
      if (seenAssignments.has(key)) return false;
      seenAssignments.add(key);
      return true;
    })
    .map(({ userId, assignmentRole }) => ({
      projectId,
      userId,
      managerId,
      manager: managerId,
      assignedById,
      assignmentRole,
      version: version || "initial",
    }));
}

function isDuplicateKeyError(error: unknown): error is { code: number } {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: number }).code === 11000
  );
}

async function insertProject(values: Record<string, unknown>) {
  try {
    return await ProjectModel.create(values);
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new AppError(
        "A project with the same name, version, letter number, and type already exists",
        HTTP_STATUS.CONFLICT
      );
    }
    throw error;
  }
}

async function rollbackProjectCreation(projectId: string) {
  const results = await Promise.allSettled([
    ProjectAssignmentModel.deleteMany({
      $or: [{ projectId }, { project: projectId }],
    }),
    ProjectModel.deleteOne({ _id: projectId }),
  ]);
  const rollbackErrors = results.flatMap((result) =>
    result.status === "rejected" ? [result.reason] : []
  );
  if (rollbackErrors.length) {
    console.error("Project creation rollback was incomplete", {
      projectId,
      errors: rollbackErrors,
    });
  }
}

async function runProjectPostCommitEffect(
  label: string,
  effect: () => Promise<unknown> | unknown
) {
  try {
    await effect();
  } catch (error) {
    console.error(`Project created, but ${label} failed`, error);
  }
}

async function upsertProjectAssignment({
  projectId,
  userId,
  assignmentRole,
  version,
  values,
}: {
  projectId: string;
  userId: string;
  assignmentRole: ProjectAssignableRole;
  version: string;
  values: Record<string, unknown>;
}) {
  const identity = { projectId, userId, assignmentRole, version };
  const update = { $set: values };

  try {
    return await ProjectAssignmentModel.findOneAndUpdate(identity, update, {
      new: true,
      upsert: true,
      runValidators: true,
    });
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;

    // A concurrent identical request may win the upsert. Retrying as an update
    // makes the operation idempotent without hiding a genuine identity conflict.
    const assignment = await ProjectAssignmentModel.findOneAndUpdate(identity, update, {
      new: true,
      runValidators: true,
    });
    if (!assignment) {
      throw new AppError(
        "Assignment conflicts with an existing project role",
        HTTP_STATUS.CONFLICT
      );
    }
    return assignment;
  }
}

function toProjectEvent(project: {
  _id: { toString(): string };
  projectName: string;
  type?: string | null;
  createdAt: Date;
}) {
  const type = project.type && (Object.values(PROJECT_TYPES) as string[]).includes(project.type)
    ? project.type as ProjectType
    : undefined;
  return {
    id: project._id.toString(),
    projectName: project.projectName,
    type,
    createdAt: project.createdAt,
  };
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function normalizeLegacyProject<T extends Record<string, unknown>>(project: T) {
  const type = getEffectiveProjectType(project);
  const rawStatus = String(project.status || "open").toLowerCase();
  const deadlineEnabled = project.deadlineEnabled !== false;
  const deadlineClosurePaused = rawStatus === "closed" &&
    project.closureReason === "deadline" && !deadlineEnabled;
  const status = deadlineClosurePaused
    ? "open"
    : rawStatus === "closed" ? "finished" : rawStatus;
  const deadline = getProjectDeadline(project);

  return {
    ...project,
    type,
    status,
    deadlineEnabled,
    deadlinePassed: Boolean(deadline && deadline.getTime() <= Date.now()),
    provisioningStatus: getEffectiveProvisioningStatus(project),
    createdAt: project.createdAt || project.created_date,
    id: String(project._id),
  };
}

const PROJECT_DETAIL_CORE_FIELDS = [
  "_id",
  "projectName",
  "projectGroupId",
  "canonicalName",
  "version",
  "platform",
  "type",
  "projectType",
  "status",
  "expireDay",
  "expireDayQuality",
  "testExpiresAt",
  "createdAt",
  "created_date",
  "updatedAt",
  "representative",
  "provisioningStatus",
  "provisioningAttemptNumber",
  "provisioningHistory",
  "devopsConfirmedBy",
  "devopsConfirmedAt",
  "devopsNotes",
  "devopsFailureReason",
  "devopsFailureDescription",
  "devopsRecommendedAction",
  "devopsFailureEvidence",
  "devopsFailureAt",
  "provisioningBlockedDurationMs",
  "devopsResolutionMessage",
  "devopsResolutionSubmittedAt",
  "devopsResolutionSubmittedBy",
  "deadlineEnabled",
  "closureReason",
  "deadlineExpiredAt",
  "testExpiresAt",
  "expireDay",
  "expireDayQuality",
] as const;

const PROJECT_RESPONSIBILITY_SOURCE_FIELDS = [
  "assignedUserIds",
  "type",
  "projectType",
  "projectManager",
  "qualityManager",
  "devops",
  "representative",
  "provisioningStatus",
  "provisioningAttemptNumber",
  "devopsFailureReason",
  "devopsFailureAt",
  "devopsResolutionMessage",
  "devopsResolutionSubmittedAt",
  "devopsResolutionSubmittedBy",
  "status",
  "deadlineEnabled",
  "closureReason",
  "testExpiresAt",
  "expireDay",
  "expireDayQuality",
  "deadlineExtensionRequests",
] as const;

function provisioningAwareRowActions(
  project: Record<string, unknown>,
  actions: ReturnType<typeof resolveProjectRowActions>,
  userId?: string
) {
  const provisionedActions = getEffectiveProvisioningStatus(project) ===
    PROJECT_PROVISIONING_STATUS.DEVOPS_READY
    ? actions
    : actions.filter((action) =>
        action !== "assign-pentesters" && action !== "assign-project-members"
      );
  const deadline = getProjectDeadline(project)?.getTime();
  const deadlineEnabled = project.deadlineEnabled !== false;
  const manuallyClosed = project.status === PROJECT_STATUS.FINISHED ||
    project.status === PROJECT_STATUS.REMOVED ||
    (project.status === PROJECT_STATUS.CLOSED && project.closureReason !== "deadline");
  const individualDeadline = getApprovedIndividualDeadline(project, userId);
  const isClosed = manuallyClosed ||
    (deadlineEnabled && deadline !== undefined && deadline <= Date.now() && !individualDeadline);
  return isClosed
      ? provisionedActions.filter((action) =>
        action !== "open-pentest-workspace" &&
        action !== "assign-pentesters" &&
        action !== "assign-project-members"
      )
    : provisionedActions;
}

function assertProjectReadyForTeamAssignment(project: {
  provisioningStatus?: string | null;
}) {
  if (
    getEffectiveProvisioningStatus(project) !==
    PROJECT_PROVISIONING_STATUS.DEVOPS_READY
  ) {
    throw new AppError(
      "The project environment has not been confirmed by DevOps yet.",
      HTTP_STATUS.CONFLICT
    );
  }
}

function pickProjectFields(
  project: Record<string, unknown>,
  sourceFields: readonly string[]
) {
  const picked: Record<string, unknown> = { _id: project._id };
  for (const sourceField of sourceFields) {
    const path = sourceField.split(".");
    let source: unknown = project;
    for (const segment of path) {
      if (!source || typeof source !== "object") {
        source = undefined;
        break;
      }
      source = (source as Record<string, unknown>)[segment];
    }
    if (source === undefined) continue;
    let target = picked;
    path.forEach((segment, index) => {
      if (index === path.length - 1) {
        target[segment] = source;
      } else {
        const nested = target[segment];
        if (!nested || typeof nested !== "object") target[segment] = {};
        target = target[segment] as Record<string, unknown>;
      }
    });
  }
  return picked;
}

async function getProjectListFilter(
  view: unknown,
  user: Express.UserContext
): Promise<{
  filter: QueryFilter<ProjectDocument>;
  pentestProjectIds: Set<string>;
  assignmentProjectIds: Record<NonAdminProjectView, Set<string>>;
  assignmentRecordsByProject: Map<string, ProjectResponsibilityAssignmentSource[]>;
}> {
  const userId = user.id;
  const assignments = await ProjectAssignmentModel.find({
    $and: [
      { $or: [
        { userId },
        { pentester: userId },
        { managerId: userId },
        { manager: userId },
      ] },
      { status: { $ne: "removed" } },
    ],
  }).select(
    "projectId project userId pentester managerId manager assignmentRole status progress totalWorkTime workTimerStartedAt"
  );
  const assignedProjectIds = assignments.flatMap((assignment) => {
    const projectId = assignment.projectId || assignment.project;
    return projectId ? [projectId] : [];
  });
  const assignmentRecordsByProject = new Map<
    string,
    ProjectResponsibilityAssignmentSource[]
  >();
  for (const assignment of assignments) {
    const projectId = assignment.projectId || assignment.project;
    if (!projectId) continue;
    const key = String(projectId);
    assignmentRecordsByProject.set(key, [
      ...(assignmentRecordsByProject.get(key) || []),
      assignment,
    ]);
  }
  const assignmentRolesByProject = groupDirectAssignmentRolesForVisibility(
    assignments,
    userId
  );
  const pentestProjectIds = getResponsibilityProjectIdsByView(
    assignmentRolesByProject,
    "pentest"
  );
  const assignmentProjectIds = {
    security: getResponsibilityProjectIdsByView(assignmentRolesByProject, "security"),
    quality: getResponsibilityProjectIdsByView(assignmentRolesByProject, "quality"),
    devops: getResponsibilityProjectIdsByView(assignmentRolesByProject, "devops"),
    pentest: pentestProjectIds,
    qa: getResponsibilityProjectIdsByView(assignmentRolesByProject, "qa"),
    representative: getResponsibilityProjectIdsByView(
      assignmentRolesByProject,
      "representative"
    ),
  };
  const result = (filter: QueryFilter<ProjectDocument>) => ({
    filter,
    pentestProjectIds,
    assignmentProjectIds,
    assignmentRecordsByProject,
  });

  switch (view) {
    case "admin":
      return result(user.permissions.includes(PERMISSIONS.ADMIN_SYSTEM_MANAGE)
        ? {}
        : { ownerId: userId });
    case "security":
      return result({
        $and: [
          { $or: [{ type: PROJECT_TYPES.SECURITY }, { projectType: { $in: ["security", "Security"] } }] },
          { $or: [{ projectManager: userId }, { _id: { $in: assignedProjectIds } }] },
        ],
      });
    case "quality":
      return result({
        $and: [
          { $or: [{ type: PROJECT_TYPES.QUALITY }, { projectType: { $in: ["quality", "Quality"] } }] },
          { $or: [
            { qualityManager: userId },
            { projectManager: userId },
            { _id: { $in: assignedProjectIds } },
          ] },
        ],
      });
    case "devops":
      return result({ $or: [{ devops: userId }, { _id: { $in: assignedProjectIds } }] });
    case "representative":
      return result({ $or: [{ representative: userId }, { _id: { $in: assignedProjectIds } }] });
    case "pentest":
      return result({ _id: { $in: [...pentestProjectIds] } });
    case "qa":
      return result({ _id: { $in: [...assignmentProjectIds.qa] } });
    case "unified": {
      const scopes: QueryFilter<ProjectDocument>[] = [];
      if (user.permissions.includes(PERMISSIONS.SECURITY_PROJECTS_READ)) {
        const securityAssignmentIds = [...assignmentProjectIds.security];
        scopes.push({
          $and: [
            { $or: [{ type: PROJECT_TYPES.SECURITY }, { projectType: { $in: ["security", "Security"] } }] },
            { $or: [{ projectManager: userId }, { _id: { $in: securityAssignmentIds } }] },
          ],
        });
      }
      if (user.permissions.includes(PERMISSIONS.QUALITY_PROJECTS_READ)) {
        const qualityAssignmentIds = [...assignmentProjectIds.quality];
        scopes.push({
          $and: [
            { $or: [{ type: PROJECT_TYPES.QUALITY }, { projectType: { $in: ["quality", "Quality"] } }] },
            { $or: [
              { qualityManager: userId },
              { projectManager: userId },
              { _id: { $in: qualityAssignmentIds } },
            ] },
          ],
        });
      }
      if (user.permissions.includes(PERMISSIONS.DEVOPS_PROJECTS_READ)) {
        const devopsAssignmentIds = [...assignmentProjectIds.devops];
        scopes.push({ $or: [{ devops: userId }, { _id: { $in: devopsAssignmentIds } }] });
      }
      if (user.permissions.includes(PERMISSIONS.REPRESENTATIVE_PROJECTS_READ)) {
        scopes.push({ $or: [
          { representative: userId },
          { _id: { $in: [...assignmentProjectIds.representative] } },
        ] });
      }
      if (user.permissions.includes(PERMISSIONS.PENTEST_PROJECTS_READ)) {
        scopes.push({ _id: { $in: [...pentestProjectIds] } });
      }
      if (user.permissions.includes(PERMISSIONS.QA_PROJECTS_READ)) {
        const qaProjectIds = [...assignmentProjectIds.qa];
        scopes.push({ _id: { $in: qaProjectIds } });
      }
      return result({ $or: scopes });
    }
    default:
      if (user.permissions.includes(PERMISSIONS.ADMIN_SYSTEM_MANAGE)) {
        return result({});
      }

      return result({
        $or: [
          { ownerId: userId },
          { projectManager: userId },
          { qualityManager: userId },
          { devops: userId },
          { representative: userId },
          { assignedUserIds: userId },
          { _id: { $in: assignedProjectIds } },
        ],
      });
  }
}

export const getProjects: RequestHandler = async (req, res, next) => {
  try {
    await closeExpiredProjects();
    const view = requireProjectListView(req.query.view, req.user!.permissions);
    const access = await getProjectListFilter(view, req.user!);
    const isAdminView = view === "admin";
    const capabilities = isAdminView
      ? undefined
      : resolveProjectListQueryCapabilities(
          req.query,
          req.user!.permissions,
          view === "unified" ? undefined : view
        );
    const escapedSearch = capabilities?.search?.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const requestedFilter: QueryFilter<ProjectDocument> = {
      ...(capabilities?.filters.status
        ? { status: capabilities.filters.status }
        : {}),
      ...(capabilities?.filters.summary
        ? { projectName: capabilities.filters.summary }
        : {}),
      ...(escapedSearch
        ? { projectName: { $regex: escapedSearch, $options: "i" } }
        : {}),
    };
    const combinedFilter: QueryFilter<ProjectDocument> = Object.keys(requestedFilter).length
      ? { $and: [access.filter, requestedFilter] }
      : access.filter;
    let query = ProjectModel.find(combinedFilter);
    if (capabilities) {
      query = query.select([
        ...capabilities.projectionFields,
        ...PROJECT_RESPONSIBILITY_SOURCE_FIELDS,
        // Needed internally to close a pentester lifecycle badge when the
        // project itself has already been completed. It is still omitted from
        // the response unless the caller may request the project Status column.
        "status",
        // Needed internally for expiration and deadline warning decisions.
  "testExpiresAt",
  "deadlineEnabled",
  "closureReason",
  "deadlineExpiredAt",
  "manuallyClosedAt",
        "expireDay",
        "expireDayQuality",
        "deadlineEnabled",
        "closureReason",
        "deadlineExpiredAt",
      ].join(" "));
    }
    query = capabilities?.sort
      ? query.sort({ [capabilities.sort.field]: capabilities.sort.direction })
      // ObjectId order is the reliable common creation order for both legacy
      // documents (`created_date`) and canonical documents (`createdAt`).
      : query.sort({ _id: -1 });
    if (capabilities?.page || capabilities?.pageSize) {
      const page = capabilities.page || 1;
      const pageSize = capabilities.pageSize || 20;
      query = query.skip((page - 1) * pageSize).limit(pageSize);
    }
    const projects = await query.lean();
    const now = Date.now();
    await createNotifications(projects.flatMap((project) => {
      if (project.deadlineEnabled === false ||
        [PROJECT_STATUS.CLOSED, PROJECT_STATUS.FINISHED, PROJECT_STATUS.REMOVED]
        .includes(String(project.status) as never)) return [];
      const deadlineValue = project.testExpiresAt || project.expireDay || project.expireDayQuality;
      const deadline = deadlineValue ? new Date(deadlineValue).getTime() : Number.NaN;
      if (!Number.isFinite(deadline)) return [];
      const remainingHours = (deadline - now) / 3_600_000;
      if (remainingHours <= 0 || remainingHours > 48) return [];
      return [{
        userId: req.user!.id,
        projectId: String(project._id),
        type: NOTIFICATION_TYPES.SYSTEM_ANNOUNCEMENT,
        title: "Project deadline approaching",
        message: `The deadline for "${project.projectName}" will arrive within 2 days.`,
        priority: NOTIFICATION_PRIORITIES.HIGH,
        actionUrl: `/projects/${project._id}`,
        entityId: String(project._id),
        dedupeKey: `project.deadline-48h:${project._id}:${new Date(deadline).toISOString()}`,
      }];
    })).catch((error) => {
      console.error("Project deadline warning delivery failed", error);
    });
    const canReadSecurityFindings = req.user!.permissions.some((permission) =>
      permission === PERMISSIONS.PENTEST_VULNERABILITIES_READ ||
      permission === PERMISSIONS.SECURITY_VULNERABILITIES_READ
    );
    const findingCounts = canReadSecurityFindings
      ? await getProjectFindingCounts(
          projects.map((project) => String(project._id)),
          req.user!.id
        )
      : new Map();
    sendSuccess(
      res,
      projects.map((project) => {
        if (isAdminView) return normalizeLegacyProject(project);
        const projectId = String(project._id);
        const individualDeadline = getApprovedIndividualDeadline(project, req.user!.id);
        const responsibilityContext = resolveProjectResponsibilityContext({
          project,
          user: req.user!,
          assignments: access.assignmentRecordsByProject.get(projectId) || [],
        });
        const allowedActions = provisioningAwareRowActions(
          project,
          resolveProjectRowActions(
            responsibilityContext,
            view === "unified" ? undefined : view
          ),
          req.user!.id
        );
        const pentestAssignment = findPentesterAssignment(
          access.assignmentRecordsByProject.get(projectId) || [],
          req.user!.id
        );
        const workTimer = pentestAssignment
          ? toProjectAssignmentWorkTimerSnapshot(pentestAssignment)
          : undefined;
        const storedProgress = Number(pentestAssignment?.progress);
        const projectFindingCounts = findingCounts.get(projectId);
        const isSecurityManager = responsibilityContext.responsibilityKeys.includes(
          "security_manager"
        );
        const visibleFindingCount = resolveVisibleProjectFindingCount({
          counts: projectFindingCounts,
          isSecurityManager,
          isPentester: Boolean(pentestAssignment),
        });
        let responseSource: Record<string, unknown> = project;
        if (view === "unified") {
          const rowViews = [...resolveResponsibilityViews(
            responsibilityContext,
            req.user!.permissions
          )].filter((rowView): rowView is NonAdminProjectView =>
            rowView !== "admin" &&
            (NON_ADMIN_PROJECT_VIEWS as readonly string[]).includes(rowView)
          );
          const allowedSourceFields = resolveProjectRowSourceFields(
            req.user!.permissions,
            rowViews,
            capabilities?.columnKeys || []
          );
          responseSource = pickProjectFields(project, allowedSourceFields);
        } else {
          responseSource = pickProjectFields(
            project,
            [
              ...(capabilities?.projectionFields || []),
              "provisioningStatus",
              "provisioningAttemptNumber",
              "devopsFailureReason",
              "devopsFailureAt",
              "devopsResolutionMessage",
              "devopsResolutionSubmittedAt",
              "devopsResolutionSubmittedBy",
              // Required by the DevOps drawer to identify the assigned actor.
              // The API still enforces assignment again on every transition.
              "devops",
            ]
          );
        }
        return {
          ...normalizeLegacyProject(responseSource),
          ...(individualDeadline && project.closureReason === "deadline"
            ? { status: PROJECT_STATUS.OPEN }
            : {}),
          provisioningStatus: getEffectiveProvisioningStatus(project),
          provisioningAttemptNumber: project.provisioningAttemptNumber || 1,
          devopsFailureReason: project.devopsFailureReason,
          devopsFailureAt: project.devopsFailureAt,
          devopsResolutionMessage: project.devopsResolutionMessage,
          devopsResolutionSubmittedAt: project.devopsResolutionSubmittedAt,
          devopsResolutionSubmittedBy: project.devopsResolutionSubmittedBy,
          responsibilityContext,
          myResponsibilities: responsibilityContext.responsibilityKeys,
          allowedActions,
          deadlineEnabled: project.deadlineEnabled !== false,
          deadlinePassed: Boolean(getProjectDeadline(project) &&
            getProjectDeadline(project)!.getTime() <= now),
          closureReason: project.closureReason,
          vulnerabilities: visibleFindingCount,
          ...(workTimer
            ? {
                assignmentStatus: workTimer.status,
                pentesterTableStatus: toPentesterTableStatus(
                  individualDeadline && pentestAssignment?.status === PROJECT_ASSIGNMENT_STATUS.CLOSED
                    ? PROJECT_ASSIGNMENT_STATUS.PENDING
                    : pentestAssignment?.status,
                  individualDeadline
                    ? PROJECT_STATUS.OPEN
                    : project.status === PROJECT_STATUS.CLOSED &&
                    project.closureReason === "deadline" &&
                    project.deadlineEnabled === false
                    ? PROJECT_STATUS.OPEN
                    : project.status
                ),
                totalWorkTime: workTimer.totalWorkTime,
                workTimerStartedAt: workTimer.workTimerStartedAt,
              }
            : {}),
          ...(pentestAssignment
            ? { progress: Number.isFinite(storedProgress) ? storedProgress : 0 }
            : {}),
        };
      })
    );
  } catch (error) {
    next(error);
  }
};

export const getProject: RequestHandler = async (req, res, next) => {
  try {
    const projectId = String(req.params.id);
    await closeExpiredProjects();
    const isAdmin = req.user!.permissions.includes(PERMISSIONS.ADMIN_SYSTEM_MANAGE);
    const capabilities = isAdmin
      ? undefined
      : resolveProjectListQueryCapabilities({}, req.user!.permissions);
    let projectQuery = ProjectModel.findById(projectId);
    if (capabilities) {
      // Detail pages require a stable set of non-sensitive identity fields.
      // Table-column visibility controls must not remove values such as
      // platform or project type from an otherwise authorized project detail.
      projectQuery = projectQuery.select(
        [...new Set([...PROJECT_DETAIL_CORE_FIELDS, ...capabilities.projectionFields])].join(" ")
      );
    }
    const project = await projectQuery.lean();

    if (!project) {
      throw new AppError("Project not found", HTTP_STATUS.NOT_FOUND);
    }

    const [userAssignments, responsibilitySource] = isAdmin
      ? [[], project]
      : await Promise.all([
          ProjectAssignmentModel.find({
            $and: [
              { $or: [
                { userId: req.user!.id },
                { pentester: req.user!.id },
                { managerId: req.user!.id },
                { manager: req.user!.id },
              ] },
              { $or: [{ projectId }, { project: projectId }] },
              { status: { $ne: "removed" } },
            ],
          })
            .select(
              "projectId project userId pentester managerId manager assignmentRole securityScope status totalWorkTime workTimerStartedAt"
            )
            .lean(),
          ProjectModel.findById(projectId)
            .select(PROJECT_RESPONSIBILITY_SOURCE_FIELDS.join(" "))
            .lean(),
        ]);
    const responsibilityContext = isAdmin
      ? undefined
      : resolveProjectResponsibilityContext({
          project: responsibilitySource || project,
          user: req.user!,
          assignments: userAssignments,
        });
    const pentestAssignment = findPentesterAssignment(
      userAssignments,
      req.user!.id
    );
    const workTimer = pentestAssignment
      ? toProjectAssignmentWorkTimerSnapshot(pentestAssignment)
      : undefined;
    const individualDeadline = isAdmin
      ? undefined
      : getApprovedIndividualDeadline(responsibilitySource || project, req.user!.id);

    sendSuccess(res, {
      ...normalizeLegacyProject(project),
      ...(individualDeadline && responsibilitySource?.closureReason === "deadline"
        ? { status: PROJECT_STATUS.OPEN }
        : {}),
      ...(responsibilityContext ? {
        responsibilityContext,
        myResponsibilities: responsibilityContext.responsibilityKeys,
        allowedActions: provisioningAwareRowActions(
          responsibilitySource || project,
          resolveProjectRowActions(responsibilityContext),
          req.user!.id
        ),
      } : {}),
      ...(pentestAssignment?.securityScope
        ? { assignedSecurityScope: pentestAssignment.securityScope }
        : {}),
      ...(workTimer
        ? {
            assignmentStatus: workTimer.status,
            pentesterTableStatus: toPentesterTableStatus(
              individualDeadline && pentestAssignment?.status === PROJECT_ASSIGNMENT_STATUS.CLOSED
                ? PROJECT_ASSIGNMENT_STATUS.PENDING
                : pentestAssignment?.status,
              individualDeadline
                ? PROJECT_STATUS.OPEN
                : project.status === PROJECT_STATUS.CLOSED &&
                project.closureReason === "deadline" &&
                project.deadlineEnabled === false
                ? PROJECT_STATUS.OPEN
                : project.status
            ),
            totalWorkTime: workTimer.totalWorkTime,
            workTimerStartedAt: workTimer.workTimerStartedAt,
          }
        : {}),
    });
  } catch (error) {
    next(error);
  }
};

export const closeProject: RequestHandler = async (req, res, next) => {
  try {
    const project = await ProjectModel.findByIdAndUpdate(
      String(req.params.id),
      {
        $set: {
          status: PROJECT_STATUS.CLOSED,
          closureReason: "manual",
          manuallyClosedAt: new Date(),
        },
        $unset: { deadlineExpiredAt: 1 },
      },
      { new: true }
    );
    if (!project) throw new AppError("Project not found", HTTP_STATUS.NOT_FOUND);
    await closeProjectAssignmentWorkTimers([project._id.toString()]);
    await writeAuditLog({
      req,
      action: AUDIT_ACTIONS.PROJECT_CLOSE,
      entityType: AUDIT_ENTITY_TYPES.PROJECT,
      entityId: project._id.toString(),
      metadata: { status: PROJECT_STATUS.CLOSED, manuallyClosed: true },
    });
    sendSuccess(res, normalizeLegacyProject(project.toObject()));
  } catch (error) {
    next(error);
  }
};

export const updateProjectDeadlineSettings: RequestHandler = async (req, res, next) => {
  try {
    const project = await ProjectModel.findById(String(req.params.id));
    if (!project) throw new AppError("Project not found", HTTP_STATUS.NOT_FOUND);
    const wasDeadlineClosed = project.closureReason === "deadline";
    project.deadlineEnabled = req.body.deadlineEnabled;
    await project.save();
    if (!req.body.deadlineEnabled && wasDeadlineClosed) {
      await reopenDeadlineClosedAssignments(project._id.toString());
    }
    if (req.body.deadlineEnabled) {
      await closeExpiredProjects();
      if (wasDeadlineClosed) {
        await closeProjectAssignmentWorkTimers([project._id.toString()]);
      }
    }
    const currentProject = await ProjectModel.findById(project._id).lean();
    sendSuccess(res, normalizeLegacyProject(currentProject || project.toObject()));
  } catch (error) {
    next(error);
  }
};

const ACTIVE_DEADLINE_REQUEST_STATUSES = [
  "pending",
  "pending_technical_review",
  "pending_admin_review",
];

function deadlineTechnicalManagerId(project: {
  type?: unknown;
  projectType?: unknown;
  projectManager?: unknown;
  qualityManager?: unknown;
}) {
  return getEffectiveProjectType(project) === PROJECT_TYPES.QUALITY
    ? String(project.qualityManager || project.projectManager || "")
    : String(project.projectManager || "");
}

async function deadlineRequestActor(project: {
  _id: mongoose.Types.ObjectId;
  type?: unknown;
  projectType?: unknown;
  projectManager?: unknown;
  qualityManager?: unknown;
}, userId: string) {
  const projectType = getEffectiveProjectType(project);
  const isTechnicalManager = deadlineTechnicalManagerId(project) === userId;
  const expectedRole = projectType === PROJECT_TYPES.QUALITY
    ? PROJECT_ASSIGNMENT_ROLES.QA
    : PROJECT_ASSIGNMENT_ROLES.PENTESTER;
  const testerAssignment = await ProjectAssignmentModel.findOne({
    $and: [
      { status: { $ne: PROJECT_ASSIGNMENT_STATUS.REMOVED } },
      { $or: [{ projectId: project._id }, { project: project._id }] },
      { $or: [{ userId }, { pentester: userId }] },
      { $or: [
        { assignmentRole: expectedRole },
        { assignmentRole: { $exists: false } },
      ] },
    ],
  }).select("_id").lean();
  return { isTechnicalManager, isTester: Boolean(testerAssignment) };
}

async function activeDeadlineAdminIds() {
  const admins = await UserModel.find({
    $and: [
      { $or: [{ roles: ROLES.ADMIN }, { "roles.Admin": { $gt: 0 } }] },
      { $or: [{ isActive: true }, { isActive: { $exists: false } }] },
    ],
  }).select("_id").lean();
  return admins.map((admin) => String(admin._id));
}

export const getDeadlineExtensionRequests: RequestHandler = async (req, res, next) => {
  try {
    const project = await ProjectModel.findById(String(req.params.id))
      .select("type projectType projectManager qualityManager deadlineExtensionRequests")
      .lean();
    if (!project) throw new AppError("Project not found", HTTP_STATUS.NOT_FOUND);
    const isAdmin = req.user!.permissions.includes(PERMISSIONS.ADMIN_SYSTEM_MANAGE);
    const actor = await deadlineRequestActor(project, req.user!.id);
    const requests = (project.deadlineExtensionRequests || []).filter((request) => {
      const type = request.requestType || "project";
      if (isAdmin) return type === "project";
      if (actor.isTechnicalManager) return true;
      return String(request.requestedBy) === req.user!.id;
    });
    const userIds = [...new Set(requests.map((request) => String(request.requestedBy)))];
    const users = await UserModel.find({ _id: { $in: userIds } })
      .select("firstName lastName username")
      .lean();
    const names = new Map(users.map((user) => [String(user._id), {
      name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username,
      username: user.username,
    }]));
    sendSuccess(res, requests.map((request) => {
      const type = request.requestType || "project";
      const status = request.status === "pending" && type === "project"
        ? "pending_admin_review"
        : request.status;
      const actions = isAdmin && type === "project" && status === "pending_admin_review"
        ? ["approve", "reject"]
        : actor.isTechnicalManager && type === "individual" && status === "pending"
          ? ["approve", "reject"]
          : actor.isTechnicalManager && type === "project" && status === "pending_technical_review"
            ? ["forward", "reject"]
            : [];
      return {
        ...request,
        requestType: type,
        status,
        id: String(request._id),
        isOwn: String(request.requestedBy) === req.user!.id,
        requester: names.get(String(request.requestedBy)),
        actions,
      };
    }));
  } catch (error) {
    next(error);
  }
};

export const createDeadlineExtensionRequest: RequestHandler = async (req, res, next) => {
  try {
    const project = await ProjectModel.findById(String(req.params.id));
    if (!project) throw new AppError("Project not found", HTTP_STATUS.NOT_FOUND);
    const deadline = getProjectDeadline(project);
    if (!deadline || Date.now() >= deadline.getTime()) {
      throw new AppError("Deadline extension requests must be created before the project expires", HTTP_STATUS.CONFLICT);
    }
    if (project.status === PROJECT_STATUS.CLOSED ||
      project.status === PROJECT_STATUS.FINISHED ||
      project.status === PROJECT_STATUS.REMOVED) {
      throw new AppError("A closed project cannot accept extension requests", HTTP_STATUS.CONFLICT);
    }
    const requestedDeadline = new Date(req.body.requestedDeadline);
    if (requestedDeadline.getTime() <= deadline.getTime()) {
      throw new AppError("The requested deadline must be later than the current project deadline", HTTP_STATUS.BAD_REQUEST);
    }
    const actor = await deadlineRequestActor(project, req.user!.id);
    if (!actor.isTester && !actor.isTechnicalManager) {
      throw new AppError("Only assigned testers or technical managers can request an extension", HTTP_STATUS.FORBIDDEN);
    }
    if (req.body.requestType === "individual" && !actor.isTester) {
      throw new AppError("Technical managers cannot request an individual extension", HTTP_STATUS.FORBIDDEN);
    }
    const pending = project.deadlineExtensionRequests.some((request) =>
      String(request.requestedBy) === req.user!.id &&
      (request.requestType || "project") === req.body.requestType &&
      ACTIVE_DEADLINE_REQUEST_STATUSES.includes(request.status)
    );
    if (pending) {
      throw new AppError("You already have a pending deadline extension request", HTTP_STATUS.CONFLICT);
    }
    const status = req.body.requestType === "individual"
      ? "pending"
      : actor.isTechnicalManager ? "pending_admin_review" : "pending_technical_review";
    project.deadlineExtensionRequests.push({
      requestedBy: new mongoose.Types.ObjectId(req.user!.id),
      requestedAt: new Date(),
      requestType: req.body.requestType,
      currentDeadline: deadline,
      requestedDeadline,
      message: req.body.message,
      status,
    });
    await project.save();
    const request = project.deadlineExtensionRequests.at(-1)!;
    const recipients = actor.isTechnicalManager && req.body.requestType === "project"
      ? await activeDeadlineAdminIds()
      : [deadlineTechnicalManagerId(project)].filter(Boolean);
    await createNotifications(recipients.map((userId) => ({
      userId,
      projectId: project._id.toString(),
      type: NOTIFICATION_TYPES.SYSTEM_ANNOUNCEMENT,
      title: "Deadline extension requested",
      message: `A ${req.body.requestType} deadline extension was requested for "${project.projectName}".`,
      priority: NOTIFICATION_PRIORITIES.HIGH,
      actionUrl: `/projects/${project._id}`,
      entityId: String(request._id),
      dedupeKey: `project.deadline-extension:${request._id}:${userId}`,
    })));
    sendSuccess(res, request, HTTP_STATUS.CREATED);
  } catch (error) {
    next(error);
  }
};

export const reviewDeadlineExtensionRequest: RequestHandler = async (req, res, next) => {
  try {
    const project = await ProjectModel.findById(String(req.params.id));
    if (!project) throw new AppError("Project not found", HTTP_STATUS.NOT_FOUND);
    const request = project.deadlineExtensionRequests.find((item) =>
      String(item._id) === String(req.params.requestId)
    );
    if (!request) throw new AppError("Deadline extension request not found", HTTP_STATUS.NOT_FOUND);
    const requestType = request.requestType || "project";
    const status = request.status === "pending" && requestType === "project"
      ? "pending_admin_review"
      : request.status;
    const isAdmin = req.user!.permissions.includes(PERMISSIONS.ADMIN_SYSTEM_MANAGE);
    const isTechnicalManager = deadlineTechnicalManagerId(project) === req.user!.id;
    const now = new Date();

    if (requestType === "individual") {
      if (!isTechnicalManager || status !== "pending" || req.body.action === "forward") {
        throw new AppError("Only the assigned Technical Manager can review this request", HTTP_STATUS.FORBIDDEN);
      }
      request.status = req.body.action === "approve" ? "approved" : "rejected";
      request.approvedDeadline = req.body.action === "approve" ? request.requestedDeadline : undefined;
      request.technicalReviewedBy = new mongoose.Types.ObjectId(req.user!.id);
      request.technicalReviewedAt = now;
      request.technicalReviewNote = req.body.reviewNote;
      request.reviewedBy = request.technicalReviewedBy;
      request.reviewedAt = now;
      request.reviewNote = req.body.reviewNote;
      if (request.status === "approved") {
        if (!request.approvedDeadline || request.approvedDeadline <= now) {
          throw new AppError("The requested individual deadline has already passed", HTTP_STATUS.CONFLICT);
        }
        await reopenDeadlineClosedAssignment(project._id.toString(), String(request.requestedBy));
      }
    } else if (status === "pending_technical_review") {
      if (!isTechnicalManager || !["forward", "reject"].includes(req.body.action)) {
        throw new AppError("Only the assigned Technical Manager can review this request", HTTP_STATUS.FORBIDDEN);
      }
      request.status = req.body.action === "forward"
        ? "pending_admin_review"
        : "rejected_by_technical_manager";
      request.technicalReviewedBy = new mongoose.Types.ObjectId(req.user!.id);
      request.technicalReviewedAt = now;
      request.technicalReviewNote = req.body.reviewNote;
      request.reviewedBy = request.technicalReviewedBy;
      request.reviewedAt = now;
      request.reviewNote = req.body.reviewNote;
      if (request.status === "pending_admin_review") {
        const adminIds = await activeDeadlineAdminIds();
        await createNotifications(adminIds.map((userId) => ({
          userId,
          projectId: project._id.toString(),
          type: NOTIFICATION_TYPES.SYSTEM_ANNOUNCEMENT,
          title: "Project deadline extension recommended",
          message: `A Technical Manager recommended extending "${project.projectName}".`,
          priority: NOTIFICATION_PRIORITIES.HIGH,
          actionUrl: `/projects/${project._id}`,
          entityId: String(request._id),
          dedupeKey: `project.deadline-extension-forward:${request._id}:${userId}`,
        })));
      }
    } else if (status === "pending_admin_review") {
      if (!isAdmin || !["approve", "reject"].includes(req.body.action)) {
        throw new AppError("Only a Lab Admin can make the final project deadline decision", HTTP_STATUS.FORBIDDEN);
      }
      request.status = req.body.action === "approve" ? "approved" : "rejected_by_admin";
      request.adminReviewedBy = new mongoose.Types.ObjectId(req.user!.id);
      request.adminReviewedAt = now;
      request.adminReviewNote = req.body.reviewNote;
      request.reviewedBy = request.adminReviewedBy;
      request.reviewedAt = now;
      request.reviewNote = req.body.reviewNote;
      if (request.status === "approved") {
        const approvedDeadline = request.requestedDeadline;
        if (!approvedDeadline || approvedDeadline <= now) {
          throw new AppError("The requested project deadline has already passed", HTTP_STATUS.CONFLICT);
        }
        request.approvedDeadline = approvedDeadline;
        project.testExpiresAt = approvedDeadline;
        project.expireDay = approvedDeadline;
        if (project.expireDayQuality) project.expireDayQuality = approvedDeadline;
        if (project.closureReason === "deadline") {
          project.status = PROJECT_STATUS.OPEN;
          project.closureReason = undefined;
          project.deadlineExpiredAt = undefined;
          await reopenDeadlineClosedAssignments(project._id.toString());
        }
      }
    } else {
      throw new AppError("This request has already been reviewed", HTTP_STATUS.CONFLICT);
    }

    await project.save();
    await createNotifications([{
      userId: String(request.requestedBy),
      projectId: project._id.toString(),
      type: NOTIFICATION_TYPES.SYSTEM_ANNOUNCEMENT,
      title: "Deadline extension updated",
      message: `The deadline extension request for "${project.projectName}" is now ${request.status}.`,
      priority: NOTIFICATION_PRIORITIES.HIGH,
      actionUrl: `/projects/${project._id}`,
      entityId: String(request._id),
      dedupeKey: `project.deadline-extension-review:${request._id}:${request.status}`,
    }]);
    sendSuccess(res, request);
  } catch (error) {
    next(error);
  }
};

export const getProjectSecurityStandards: RequestHandler = async (req, res, next) => {
  try {
    sendSuccess(res, await listProjectSecurityStandards(String(req.params.id)));
  } catch (error) {
    next(error);
  }
};

function normalizedBugVisibilitySettings(project: {
  pentesterBugVisibility?: {
    timeRequirementEnabled?: boolean;
    requiredHours?: number;
    userOverrides?: Array<{ userId?: unknown; requiredHours?: number }>;
  };
}) {
  const stored = project.pentesterBugVisibility;
  return {
    timeRequirementEnabled: stored?.timeRequirementEnabled !== false,
    requiredHours:
      typeof stored?.requiredHours === "number" && Number.isFinite(stored.requiredHours)
      ? Number(stored?.requiredHours)
      : 30,
    userOverrides: (stored?.userOverrides || []).flatMap((override) =>
      override.userId
        ? [{
            userId: String(override.userId),
            requiredHours: Number(override.requiredHours) || 0,
          }]
        : []
    ),
  };
}

async function eligiblePentestersForBugVisibility(projectId: string) {
  const assignments = await ProjectAssignmentModel.find({
    $and: [
      { $or: [{ projectId }, { project: projectId }] },
      { status: { $ne: PROJECT_ASSIGNMENT_STATUS.REMOVED } },
      {
        $or: [
          { assignmentRole: PROJECT_ASSIGNMENT_ROLES.PENTESTER },
          { assignmentRole: { $exists: false }, pentester: { $exists: true } },
        ],
      },
    ],
  }).select("userId pentester").lean();
  const ids = [...new Set(assignments
    .map((assignment) => String(assignment.userId || assignment.pentester || ""))
    .filter(Boolean))];
  const users = await UserModel.find({ _id: { $in: ids } })
    .select("firstName lastName username")
    .lean();
  return users.map((user) => ({
    userId: String(user._id),
    name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username,
    username: user.username,
  }));
}

export const getProjectBugVisibilitySettings: RequestHandler = async (req, res, next) => {
  try {
    const projectId = String(req.params.id);
    const project = await ProjectModel.findById(projectId)
      .select("pentesterBugVisibility")
      .lean();
    if (!project) throw new AppError("Project not found", HTTP_STATUS.NOT_FOUND);
    sendSuccess(res, {
      ...normalizedBugVisibilitySettings(project),
      eligiblePentesters: await eligiblePentestersForBugVisibility(projectId),
    });
  } catch (error) {
    next(error);
  }
};

export const putProjectBugVisibilitySettings: RequestHandler = async (req, res, next) => {
  try {
    const projectId = String(req.params.id);
    const eligiblePentesters = await eligiblePentestersForBugVisibility(projectId);
    const eligibleIds = new Set(eligiblePentesters.map((user) => user.userId));
    const invalidOverride = req.body.userOverrides.find(
      (override: { userId: string }) => !eligibleIds.has(override.userId)
    );
    if (invalidOverride) {
      throw new AppError(
        "Bug visibility overrides require an active pentester assignment",
        HTTP_STATUS.BAD_REQUEST
      );
    }
    const project = await ProjectModel.findByIdAndUpdate(
      projectId,
      { $set: { pentesterBugVisibility: req.body } },
      { new: true, runValidators: true }
    ).select("pentesterBugVisibility").lean();
    if (!project) throw new AppError("Project not found", HTTP_STATUS.NOT_FOUND);
    sendSuccess(res, {
      ...normalizedBugVisibilitySettings(project),
      eligiblePentesters,
    });
  } catch (error) {
    next(error);
  }
};

export const getProjectSecurityScope: RequestHandler = async (req, res, next) => {
  try {
    const result = await getResolvedProjectSecurityScope(
      String(req.params.id),
      req.user!.id
    );
    sendSuccess(res, {
      ...result.scope.toObject(),
      id: result.scope._id.toString(),
      effectiveSelectedNodeIds: result.effectiveSelectedNodeIds,
    });
  } catch (error) {
    next(error);
  }
};

export const getProjectPentesterScopes: RequestHandler = async (req, res, next) => {
  try {
    const projectId = String(req.params.id);
    const assignments = await ProjectAssignmentModel.find({
      $and: [
        { $or: [{ projectId }, { project: projectId }] },
        {
          $or: [
            { assignmentRole: PROJECT_ASSIGNMENT_ROLES.PENTESTER },
            { assignmentRole: { $exists: false } },
          ],
        },
      ],
    })
      .select("userId pentester securityScope")
      .lean();

    sendSuccess(res, {
      assignedUserIds: assignments.flatMap((assignment) => {
        const userId = assignment.userId || assignment.pentester;
        return userId ? [String(userId)] : [];
      }),
      pentesterScopes: assignments.flatMap((assignment) =>
        assignment.securityScope && (assignment.userId || assignment.pentester)
          ? [
              {
                userId: String(assignment.userId || assignment.pentester),
                securityScope: assignment.securityScope,
              },
            ]
          : []
      ),
    });
  } catch (error) {
    next(error);
  }
};

export const putProjectSecurityScope: RequestHandler = async (req, res, next) => {
  try {
    const input = securityScopeReferenceSchema.parse(req.body);
    const scope = await saveProjectSecurityScope(
      String(req.params.id),
      input,
      req.user!.id
    );
    sendSuccess(res, { ...scope.toObject(), id: scope._id.toString() });
  } catch (error) {
    next(error);
  }
};

export const createProject: RequestHandler = async (req, res, next) => {
  try {
    const request = createProjectRequestSchema.parse(req.body);
    const projectData = mapCreateProjectRequest(request);
    if (request.sourceProjectId) {
      const sourceProject = await ProjectModel.findById(request.sourceProjectId)
        .select("projectGroupId canonicalName projectName")
        .lean();

      if (!sourceProject) {
        throw new AppError("Source project not found", HTTP_STATUS.BAD_REQUEST);
      }

      projectData.projectGroupId =
        sourceProject.projectGroupId || String(sourceProject._id);
      projectData.canonicalName = sourceProject.canonicalName || undefined;
    }

    const recipients = {
      projectManager:
        request.type === PROJECT_TYPES.SECURITY
          ? projectData.projectManager
          : undefined,
      qualityManager: projectData.qualityManager,
      devops: projectData.devops,
      representative: projectData.representative,
    };
    await validateProjectRecipients(recipients);
    const projectMemberIds = Array.from(
      new Set(
        [
          req.user!.id,
          projectData.projectManager,
          projectData.qualityManager,
          projectData.devops,
          projectData.representative,
        ].filter(isString)
      )
    );

    const project = await insertProject({
      ...projectData,
      ownerId: req.user!.id,
      provisioningStatus: PROJECT_PROVISIONING_STATUS.AWAITING_DEVOPS_SETUP,
      provisioningAttemptNumber: 1,
    });
    const projectId = project._id.toString();
    try {
      const initialAssignments = buildInitialProjectAssignments({
        assignedById: req.user!.id,
        projectId,
        projectManagerId: projectData.projectManager,
        qualityManagerId: projectData.qualityManager,
        devopsManagerId: projectData.devops,
        representativeId: projectData.representative,
        projectType: project.type,
        version: project.version,
      });

      if (initialAssignments.length) {
        const createdAssignments = await ProjectAssignmentModel.insertMany(
          initialAssignments,
          { ordered: true }
        );
        project.userProject = createdAssignments.map((assignment) => assignment._id);
        project.assignedUserIds = Array.from(
          new Set(initialAssignments.map((assignment) => assignment.userId))
        ).map((userId) => new mongoose.Types.ObjectId(userId));
        await project.save();
      }

    } catch (error) {
      await rollbackProjectCreation(projectId);
      if (isDuplicateKeyError(error)) {
        throw new AppError(
          "An initial project assignment conflicts with an existing assignment",
          HTTP_STATUS.CONFLICT
        );
      }
      throw error;
    }

    await runProjectPostCommitEffect("DevOps assignment notification delivery", () =>
      notifyInitialDevopsAssignment({
        projectId,
        projectName: project.projectName,
        devopsUserId: String(projectData.devops),
      })
    );
    await runProjectPostCommitEffect("realtime room synchronization", () =>
      addConnectedUsersToProject(projectMemberIds, projectId)
    );
    await runProjectPostCommitEffect("project-created realtime delivery", () =>
      emitToProject(projectId, SOCKET_EVENTS.PROJECT_CREATED, toProjectEvent(project))
    );

    await writeAuditLog({
      req,
      action: AUDIT_ACTIONS.PROJECT_CREATE,
      entityType: AUDIT_ENTITY_TYPES.PROJECT,
      entityId: projectId,
      metadata: {
        projectName: project.projectName,
        type: project.type,
        projectManagerId: projectData.projectManager,
        devopsManagerId: projectData.devops,
      },
    });

    sendSuccess(
      res,
      { ...project.toObject(), id: project._id.toString() },
      HTTP_STATUS.CREATED
    );
  } catch (error) {
    next(error);
  }
};

export const getEligibleProjectAssignees: RequestHandler = async (req, res, next) => {
  try {
    const role = String(req.query.role || "pentester") as ProjectAssignableRole;
    const roleRule = assignableRoleRules[role];

    if (!roleRule) {
      throw new AppError("Unsupported assignee role", HTTP_STATUS.BAD_REQUEST);
    }
    if (req.project) assertProjectReadyForTeamAssignment(req.project);
    assertProjectAssignmentActionAllowed(
      req.user!.permissions,
      role,
      req.project
        ? getEffectiveProjectType(req.project as unknown as Record<string, unknown>)
        : undefined
    );

    const users = (
      await UserModel.find({ isActive: true }).sort({
        firstName: 1,
        lastName: 1,
        username: 1,
      })
    ).filter((user) => userHasAnyRole(user, roleRule.roles));

    sendSuccess(res, await Promise.all(users.map((user) => toAuthUserContext(user))));
  } catch (error) {
    next(error);
  }
};

export const assignUsersToProject: RequestHandler = async (req, res, next) => {
  try {
    const projectId = String(req.params.id);
    await assertProjectOpenForWork(projectId);
    if (!mongoose.isValidObjectId(projectId)) {
      throw new AppError("Invalid project id", HTTP_STATUS.BAD_REQUEST);
    }
    const request = assignUsersRequestSchema.parse(req.body);
    const role = request.role as ProjectAssignableRole;
    const roleRule = assignableRoleRules[role];

    if (!roleRule) {
      throw new AppError("Unsupported assignee role", HTTP_STATUS.BAD_REQUEST);
    }

    const requestedUserIds = Array.from(new Set(request.userIds));
    const requestedUserIdSet = new Set(requestedUserIds);
    const existingProject = await ProjectModel.findById(projectId);
    if (!existingProject) {
      throw new AppError("Project not found", HTTP_STATUS.NOT_FOUND);
    }
    assertProjectReadyForTeamAssignment(existingProject);
    const effectiveProjectType = getEffectiveProjectType(
      existingProject.toObject()
    );
    assertProjectAssignmentActionAllowed(
      req.user!.permissions,
      role,
      effectiveProjectType
    );
    const assignmentVersion = existingProject.version || "initial";

    if (role === PROJECT_ASSIGNMENT_ROLES.PENTESTER) {
      // Older manager assignments used the pentester legacy aliases. Release
      // those aliases so the same eligible user can also receive a pentester row.
      await ProjectAssignmentModel.updateMany(
        {
          version: assignmentVersion,
          assignmentRole: { $ne: PROJECT_ASSIGNMENT_ROLES.PENTESTER },
          $or: [
            { projectId, userId: { $in: requestedUserIds } },
            { project: projectId, pentester: { $in: requestedUserIds } },
          ],
        },
        { $unset: { project: 1, pentester: 1 } }
      );

      const legacyAssignments = await ProjectAssignmentModel.find({
        project: projectId,
        version: assignmentVersion,
        $and: [
          { $or: [{ projectId: { $exists: false } }, { userId: { $exists: false } }] },
          {
            $or: [
              { assignmentRole: PROJECT_ASSIGNMENT_ROLES.PENTESTER },
              { assignmentRole: { $exists: false } },
            ],
          },
        ],
      }).select("_id project pentester");

      await Promise.all(
        legacyAssignments.map((assignment) =>
          assignment.pentester
            ? ProjectAssignmentModel.updateOne(
                { _id: assignment._id },
                {
                  $set: {
                    projectId: assignment.project,
                    userId: assignment.pentester,
                    assignmentRole: PROJECT_ASSIGNMENT_ROLES.PENTESTER,
                  },
                }
              )
            : Promise.resolve()
        )
      );
    }

    const existingAssignments = await ProjectAssignmentModel.find({
      projectId,
      assignmentRole: role,
    }).select("_id userId securityScope");
    const existingScopesByUserId = new Map(
      existingAssignments.flatMap((assignment) =>
        assignment.userId && assignment.securityScope
          ? [[String(assignment.userId), assignment.securityScope] as const]
          : []
      )
    );

    const requestedScopesByUserId = new Map(
      (request.pentesterScopes || []).map((item) => [item.userId, item.securityScope])
    );
    if (
      requestedScopesByUserId.size &&
      !req.user!.permissions.includes(PERMISSIONS.SECURITY_PROJECTS_ASSIGN) &&
      !req.user!.permissions.includes(PERMISSIONS.ADMIN_SYSTEM_MANAGE)
    ) {
      throw new AppError(
        "Forbidden: missing security scope assignment permission",
        HTTP_STATUS.FORBIDDEN
      );
    }
    if (
      requestedScopesByUserId.size &&
      effectiveProjectType !== PROJECT_TYPES.SECURITY
    ) {
      throw new AppError(
        "Pentester security scopes require a security project",
        HTTP_STATUS.BAD_REQUEST
      );
    }

    let resolvedScopesByUserId = new Map<
      string,
      Awaited<ReturnType<typeof resolvePentesterSecurityScope>>
    >();
    if (
      role === PROJECT_ASSIGNMENT_ROLES.PENTESTER &&
      effectiveProjectType === PROJECT_TYPES.SECURITY
    ) {
      try {
        const projectScope = await getOrCreateDefaultProjectSecurityScope(
          projectId,
          req.user!.id
        );
        if (projectScope) {
          resolvedScopesByUserId = new Map(
            await Promise.all(
              requestedUserIds.map(
                async (userId) =>
                  [
                    userId,
                    await resolvePentesterSecurityScope(
                      projectScope,
                      requestedScopesByUserId.get(userId) ||
                        existingScopesByUserId.get(userId)
                    ),
                  ] as const
              )
            )
          );
        }
      } catch (error) {
        if (
          !(error instanceof AppError) ||
          error.statusCode !== HTTP_STATUS.NOT_FOUND ||
          requestedScopesByUserId.size
        ) {
          throw error;
        }
      }
    }

    const activeUsers = requestedUserIds.length
      ? await UserModel.find({
          _id: { $in: requestedUserIds },
          isActive: true,
        })
          .select("_id roles devOps security qualityAssurance")
          .lean()
      : [];

    if (activeUsers.length !== requestedUserIds.length) {
      throw new AppError(
        "One or more assigned users were not found or are inactive",
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const invalidUsers = activeUsers.filter(
      (user) => !userHasAnyRole(user, roleRule.roles)
    );
    if (invalidUsers.length) {
      throw new AppError(
        `One or more selected users are not eligible ${roleRule.label}s`,
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const existingRoleUserIds = new Set(
      existingAssignments
        .map((assignment) => (assignment.userId ? String(assignment.userId) : undefined))
        .filter((userId): userId is string => Boolean(userId))
    );
    const addedUserIds = requestedUserIds.filter(
      (userId) => !existingRoleUserIds.has(userId)
    );
    const removedUserIds = Array.from(existingRoleUserIds).filter(
      (userId) => !requestedUserIdSet.has(userId)
    );

    if (removedUserIds.length) {
      await ProjectAssignmentModel.deleteMany({
        projectId,
        assignmentRole: role,
        userId: { $in: removedUserIds },
      });
    }

    const requestedAssignments = requestedUserIds.length
      ? await Promise.all(
        requestedUserIds.map((userId) =>
          upsertProjectAssignment({
            projectId,
            userId,
            assignmentRole: role,
            version: assignmentVersion,
            values: {
              projectId,
              ...(role === PROJECT_ASSIGNMENT_ROLES.PENTESTER
                ? { project: projectId, pentester: userId }
                : {}),
              userId,
              managerId:
                existingProject.projectManager || existingProject.qualityManager,
              manager: existingProject.projectManager || existingProject.qualityManager,
              assignedById: req.user!.id,
              assignmentRole: role,
              version: assignmentVersion,
              ...(resolvedScopesByUserId.has(userId)
                ? { securityScope: resolvedScopesByUserId.get(userId) }
                : {}),
            },
          })
        )
      )
      : [];

    const remainingAssignments = await ProjectAssignmentModel.find({ projectId }).select(
      "_id userId"
    );
    const nextAssignedUserIds = Array.from(
      new Set(
        remainingAssignments
          .map((assignment) =>
            assignment.userId ? String(assignment.userId) : undefined
          )
          .filter((userId): userId is string => Boolean(userId))
      )
    );
    const nextAssignmentIds = remainingAssignments.map((assignment) => assignment._id);

    const project = await ProjectModel.findByIdAndUpdate(
      projectId,
      { $set: { assignedUserIds: nextAssignedUserIds, userProject: nextAssignmentIds } },
      { new: true }
    );

    const fullyRemovedUserIds = removedUserIds.filter(
      (userId) => !nextAssignedUserIds.includes(userId)
    );

    const addedUserIdSet = new Set(addedUserIds);
    const addedAssignments = requestedAssignments.filter((assignment) =>
      addedUserIdSet.has(String(assignment.userId || assignment.pentester))
    );
    if (addedAssignments.length) {
      await notifyProjectAssignments({
        projectId,
        projectName: project?.projectName || existingProject.projectName,
        assignedById: req.user!.id,
        assignments: addedAssignments.map((assignment) => ({
          assignmentId: String(assignment._id),
          userId: String(assignment.userId || assignment.pentester),
          assignmentRole: assignment.assignmentRole,
        })),
      });
    }

    if (addedUserIds.length) {
      await addConnectedUsersToProject(addedUserIds, projectId);
    }

    emitToProject(
      projectId,
      SOCKET_EVENTS.PROJECT_ASSIGNED,
      toProjectEvent(project || existingProject)
    );

    await writeAuditLog({
      req,
      action: AUDIT_ACTIONS.PROJECT_ASSIGN_USERS,
      entityType: AUDIT_ENTITY_TYPES.PROJECT,
      entityId: projectId,
      metadata: {
        role,
        assignedUserIds: requestedUserIds,
        addedUserIds,
        removedUserIds,
        fullyRemovedUserIds,
      },
    });

    sendSuccess(res, {
      project,
      assignedUserIds: requestedUserIds,
      pentesterScopes: Array.from(resolvedScopesByUserId, ([userId, securityScope]) => ({
        userId,
        securityScope,
      })),
      addedUserIds,
      removedUserIds,
    });
  } catch (error) {
    next(error);
  }
};
