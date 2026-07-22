import type { RequestHandler } from "express";
import mongoose, { type QueryFilter } from "mongoose";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "@/constants/audit";
import { HTTP_STATUS } from "@/constants/http";
import { PERMISSIONS } from "@/constants/permissions";
import {
  PROJECT_ASSIGNMENT_ROLES,
  PROJECT_TYPES,
  type ProjectAssignmentRole,
  type ProjectType,
} from "@/constants/projects";
import { ROLES } from "@/constants/roles";
import type { Role } from "@/constants/roles";
import { ProjectModel, type ProjectDocument } from "../models/project.model";
import { ProjectAssignmentModel } from "../models/projectAssignment.model";
import { UserModel } from "@/modules/users/models/user.model";
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
import {
  getResponsibilityProjectIdsByView,
  groupUserAssignmentRoles,
  resolveProjectResponsibilities,
  resolveResponsibilityViews,
} from "../services/projectResponsibility.service";

type ProjectRecipientField =
  | "projectManager"
  | "qualityManager"
  | "devops"
  | "representative";
type ProjectAssignableRole = ProjectAssignmentRole;

const recipientRules: Record<
  ProjectRecipientField,
  { label: string; roles?: readonly Role[] }
> = {
  projectManager: {
    label: "project manager",
    // Project manager is a project-level responsibility, not a global RBAC role.
  },
  qualityManager: {
    label: "quality manager",
    // Quality manager is a project-level responsibility, not a global RBAC role.
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
  projectType,
  version,
}: {
  assignedById: string;
  projectId: string;
  projectManagerId?: string;
  qualityManagerId?: string;
  devopsManagerId?: string;
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

async function rollbackProjectCreation(
  projectId: string,
  projectMemberIds: string[]
) {
  const results = await Promise.allSettled([
    ProjectAssignmentModel.deleteMany({
      $or: [{ projectId }, { project: projectId }],
    }),
    UserModel.updateMany(
      { _id: { $in: projectMemberIds } },
      { $pull: { projectIds: projectId } }
    ),
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
  const status = rawStatus === "closed" ? "finished" : rawStatus;

  return {
    ...project,
    type,
    status,
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
] as const;

const PROJECT_RESPONSIBILITY_SOURCE_FIELDS = [
  "assignedUserIds",
  "type",
  "projectType",
  "projectManager",
  "qualityManager",
  "devops",
  "representative",
] as const;

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
  assignmentRolesByProject: Map<string, string[]>;
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
  }).select("projectId project userId pentester managerId manager assignmentRole");
  const assignedProjectIds = assignments.flatMap((assignment) => {
    const projectId = assignment.projectId || assignment.project;
    return projectId ? [projectId] : [];
  });
  const assignmentRolesByProject = groupUserAssignmentRoles(assignments, userId);
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
    assignmentRolesByProject,
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
      return result({ $or: [
        { assignedUserIds: userId },
        { _id: { $in: [...pentestProjectIds] } },
      ] });
    case "qa":
      return result({ $or: [
        { assignedUserIds: userId },
        { _id: { $in: [...assignmentProjectIds.qa] } },
      ] });
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
        scopes.push({ $or: [
          { assignedUserIds: userId },
          { _id: { $in: [...pentestProjectIds] } },
        ] });
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
    sendSuccess(
      res,
      projects.map((project) => {
        if (isAdminView) return normalizeLegacyProject(project);
        const projectId = String(project._id);
        const myResponsibilities = resolveProjectResponsibilities({
          project,
          userId: req.user!.id,
          assignmentRoles: access.assignmentRolesByProject.get(projectId) || [],
        });
        const allowedActions = resolveProjectRowActions(
          req.user!.permissions,
          myResponsibilities,
          view === "unified" ? undefined : view
        );
        let responseSource: Record<string, unknown> = project;
        if (view === "unified") {
          const rowViews = [...resolveResponsibilityViews(
            myResponsibilities,
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
            capabilities?.projectionFields || []
          );
        }
        return {
          ...normalizeLegacyProject(responseSource),
          myResponsibilities,
          allowedActions,
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
            .select("projectId project userId pentester managerId manager assignmentRole securityScope")
            .lean(),
          ProjectModel.findById(projectId)
            .select(PROJECT_RESPONSIBILITY_SOURCE_FIELDS.join(" "))
            .lean(),
        ]);
    const assignmentRoles = groupUserAssignmentRoles(
      userAssignments,
      req.user!.id
    ).get(projectId) || [];
    const myResponsibilities = isAdmin
      ? []
      : resolveProjectResponsibilities({
          project: responsibilitySource || project,
          userId: req.user!.id,
          assignmentRoles,
        });
    const pentestAssignment = userAssignments.find((assignment) =>
      String(assignment.userId || assignment.pentester || "") === req.user!.id &&
      (assignment.assignmentRole === PROJECT_ASSIGNMENT_ROLES.PENTESTER ||
        (!assignment.assignmentRole && assignment.pentester))
    );

    sendSuccess(res, {
      ...normalizeLegacyProject(project),
      ...(!isAdmin ? {
        myResponsibilities,
        allowedActions: resolveProjectRowActions(
          req.user!.permissions,
          myResponsibilities
        ),
      } : {}),
      ...(pentestAssignment?.securityScope
        ? { assignedSecurityScope: pentestAssignment.securityScope }
        : {}),
    });
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
      projectManager: projectData.projectManager,
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
    });
    const projectId = project._id.toString();
    try {
      const initialAssignments = buildInitialProjectAssignments({
        assignedById: req.user!.id,
        projectId,
        projectManagerId: projectData.projectManager,
        qualityManagerId: projectData.qualityManager,
        devopsManagerId: projectData.devops,
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

      await UserModel.updateMany(
        { _id: { $in: projectMemberIds } },
        { $addToSet: { projectIds: projectId } }
      );
    } catch (error) {
      await rollbackProjectCreation(projectId, projectMemberIds);
      if (isDuplicateKeyError(error)) {
        throw new AppError(
          "An initial project assignment conflicts with an existing assignment",
          HTTP_STATUS.CONFLICT
        );
      }
      throw error;
    }

    await runProjectPostCommitEffect("assignment notification delivery", async () => {
      const assignments = await ProjectAssignmentModel.find({ projectId })
        .select("_id userId pentester assignmentRole")
        .lean();
      await notifyProjectAssignments({
        projectId,
        projectName: project.projectName,
        assignedById: req.user!.id,
        assignments: assignments.flatMap((assignment) => {
          const userId = assignment.userId || assignment.pentester;
          return userId ? [{
            assignmentId: String(assignment._id),
            userId: String(userId),
            assignmentRole: assignment.assignmentRole,
          }] : [];
        }),
      });
    });
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
    assertProjectAssignmentActionAllowed(
      req.user!.permissions,
      role,
      getEffectiveProjectType(existingProject.toObject())
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
    if (requestedScopesByUserId.size && existingProject.type !== PROJECT_TYPES.SECURITY) {
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
      existingProject.type === PROJECT_TYPES.SECURITY
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

    if (addedUserIds.length) {
      await UserModel.updateMany(
        { _id: { $in: addedUserIds } },
        { $addToSet: { projectIds: projectId } }
      );
    }

    const fullyRemovedUserIds = removedUserIds.filter(
      (userId) => !nextAssignedUserIds.includes(userId)
    );

    if (fullyRemovedUserIds.length) {
      await UserModel.updateMany(
        { _id: { $in: fullyRemovedUserIds } },
        { $pull: { projectIds: projectId } }
      );
    }

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
