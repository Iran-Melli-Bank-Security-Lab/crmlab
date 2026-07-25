import { HTTP_STATUS } from "@/constants/http";
import { randomUUID } from "node:crypto";
import { PROJECT_ASSIGNMENT_ROLES, PROJECT_ASSIGNMENT_STATUS } from "@/constants/projects";
import { ProjectAssignmentModel } from "@/modules/projects/models/projectAssignment.model";
import { ProjectModel } from "@/modules/projects/models/project.model";
import { UserModel } from "@/modules/users/models/user.model";
import { AppError } from "@/utils/AppError";
import { ProjectDevopsInfoModel } from "../models/projectDevopsInfo.model";
import type { DevopsInfoInput } from "../validators/devops.validators";
import { decryptSecret, encryptSecret, type EncryptedSecret } from "./credentialCipher.service";
import {
  saveDevopsInfoAndNotify,
  type DevopsNotificationRequest,
} from "./devopsNotification.service";

type SecretInput = { value: string } | { unchanged: true };
const INACTIVE_PROJECT_ASSIGNMENT_STATUSES = [
  PROJECT_ASSIGNMENT_STATUS.REMOVED,
  PROJECT_ASSIGNMENT_STATUS.FINISHED,
  "inactive",
] as const;

type ProjectUserAssignment = {
  _id: unknown;
  userId?: unknown;
  pentester?: unknown;
  assignmentRole?: string | null;
  status?: string | null;
};

function isPentesterAssignment(assignment: ProjectUserAssignment) {
  return !assignment.assignmentRole ||
    assignment.assignmentRole === PROJECT_ASSIGNMENT_ROLES.PENTESTER;
}

export function selectCurrentPentesterAssignments(
  assignments: readonly ProjectUserAssignment[],
  preferredAssignmentIds: ReadonlySet<string> = new Set()
) {
  const eligible = assignments
    .filter((assignment) => {
      const userId = assignment.userId || assignment.pentester;
      return Boolean(userId) && isPentesterAssignment(assignment) &&
        !INACTIVE_PROJECT_ASSIGNMENT_STATUSES.includes(
          assignment.status as (typeof INACTIVE_PROJECT_ASSIGNMENT_STATUSES)[number]
        );
    })
    .sort((left, right) => {
      const leftId = String(left._id);
      const rightId = String(right._id);
      const preferred = Number(preferredAssignmentIds.has(rightId)) - Number(preferredAssignmentIds.has(leftId));
      return preferred || leftId.localeCompare(rightId);
    });
  const byUserId = new Map<string, ProjectUserAssignment>();
  eligible.forEach((assignment) => {
    const userId = String(assignment.userId || assignment.pentester);
    if (!byUserId.has(userId)) byUserId.set(userId, assignment);
  });
  return Array.from(byUserId.values());
}

export function assertPersonalDevopsTargetsAreCurrentAssignments(
  targets: readonly { assignmentId: string; userId: string }[],
  assignments: readonly ProjectUserAssignment[],
  activeUserIds: ReadonlySet<string>
) {
  const valid = new Map(assignments.flatMap((assignment) => {
    const userId = assignment.userId || assignment.pentester;
    const inactive = INACTIVE_PROJECT_ASSIGNMENT_STATUSES.includes(
      assignment.status as (typeof INACTIVE_PROJECT_ASSIGNMENT_STATUSES)[number]
    );
    return userId && !inactive && isPentesterAssignment(assignment) && activeUserIds.has(String(userId))
      ? [[String(assignment._id), String(userId)] as const]
      : [];
  }));
  if (new Set(targets.map((target) => target.userId)).size !== targets.length) {
    throw new AppError("Each assigned project user can have only one per-user environment", HTTP_STATUS.BAD_REQUEST);
  }
  for (const target of targets) {
    if (valid.get(target.assignmentId) !== target.userId) {
      throw new AppError("A per-user entry does not match a current project assignment", HTTP_STATUS.BAD_REQUEST);
    }
  }
}

function secret(input: SecretInput, existing?: EncryptedSecret): EncryptedSecret {
  if ("value" in input) return encryptSecret(input.value);
  if (existing?.ciphertext && existing.iv && existing.tag) return existing;
  throw new AppError("A new secret value is required", HTTP_STATUS.BAD_REQUEST);
}

function accountMap(accounts: any[] = []) {
  return new Map(accounts.map((account) => [account.clientId, account]));
}

function mapEndpoints(endpoints: any[], existing: any[] = []) {
  const priorEndpoints = new Map(existing.map((endpoint) => [endpoint.clientId, endpoint]));
  return endpoints.map((endpoint) => {
    const prior = priorEndpoints.get(endpoint.id);
    const priorAccounts = accountMap(prior?.authenticationAccounts);
    return {
      clientId: endpoint.id,
      url: endpoint.url,
      ipAddress: endpoint.ipAddress,
      port: endpoint.port,
      description: endpoint.description,
      authenticationAccounts: endpoint.authenticationAccounts.map((account: any) => {
        const old = priorAccounts.get(account.id);
        return {
          clientId: account.id,
          authenticationMethod: account.authenticationMethod,
          username: account.username,
          password: secret(account.password, old?.password),
          otp: account.authenticationMethod === "username_password_otp"
            ? {
                type: account.otp.type,
                secret: secret(account.otp.secret, old?.otp?.secret),
                deliveryMethod: account.otp.deliveryMethod,
                instructions: account.otp.instructions,
              }
            : undefined,
        };
      }),
    };
  });
}

function normalizeSecret(value?: EncryptedSecret) {
  return value ? decryptSecret(value) : undefined;
}

function normalizeEndpoints(items: any[] = []) {
  return items
    .map((endpoint) => ({
      id: String(endpoint.clientId),
      url: endpoint.url,
      ipAddress: endpoint.ipAddress,
      port: endpoint.port,
      description: endpoint.description,
      authenticationAccounts: (endpoint.authenticationAccounts || [])
        .map((account: any) => ({
          id: String(account.clientId),
          authenticationMethod: account.authenticationMethod,
          username: account.username,
          password: normalizeSecret(account.password),
          otp: account.otp
            ? {
                type: account.otp.type,
                secret: normalizeSecret(account.otp.secret),
                deliveryMethod: account.otp.deliveryMethod,
                instructions: account.otp.instructions,
              }
            : undefined,
        }))
        .sort((left: any, right: any) => left.id.localeCompare(right.id)),
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
}

function normalizePersonalUser(item: any) {
  return {
    assignmentId: String(item.assignmentId),
    userId: String(item.userId),
    serverUsername: item.serverUsername,
    serverPassword: normalizeSecret(item.serverPassword),
    vmIpAddress: item.vmIpAddress,
    vmPort: item.vmPort,
    endpoints: normalizeEndpoints(item.endpoints),
  };
}

function normalizeDevopsInfo(value: any) {
  if (!value) return null;
  if (value.deploymentMode === "shared_vm") {
    return {
      deploymentMode: "shared_vm",
      endpoints: normalizeEndpoints(value.sharedVm?.endpoints),
    };
  }
  return {
    deploymentMode: "separate_vm_per_user",
    serverIpAddress: value.separateVm?.serverIpAddress,
    serverPort: value.separateVm?.serverPort,
    vmUsername: value.separateVm?.vmUsername,
    vmPassword: normalizeSecret(value.separateVm?.vmPassword),
    users: (value.separateVm?.users || [])
      .map(normalizePersonalUser)
      .sort((left: any, right: any) => left.assignmentId.localeCompare(right.assignmentId)),
  };
}

function sameMeaningfulValue(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function detectDevopsNotificationChange(existing: any, replacement: any): {
  action: "created" | "updated";
  mode: "shared" | "personal";
  targetUserIds?: string[];
} | null {
  if (sameMeaningfulValue(normalizeDevopsInfo(existing), normalizeDevopsInfo(replacement))) {
    return null;
  }
  const action = existing ? "updated" as const : "created" as const;
  if (replacement.deploymentMode === "shared_vm") {
    return { action, mode: "shared" };
  }

  const nextUsers: any[] = replacement.separateVm?.users || [];
  if (!existing || existing.deploymentMode !== "separate_vm_per_user") {
    return {
      action,
      mode: "personal",
      targetUserIds: Array.from(new Set(nextUsers.map((item: any) => String(item.userId)))).sort(),
    };
  }

  const previousGlobal = normalizeDevopsInfo({
    deploymentMode: "separate_vm_per_user",
    separateVm: { ...existing.separateVm, users: [] },
  });
  const nextGlobal = normalizeDevopsInfo({
    deploymentMode: "separate_vm_per_user",
    separateVm: { ...replacement.separateVm, users: [] },
  });
  const previousUsers = new Map<string, any>((existing.separateVm?.users || []).map((item: any) => [
    String(item.assignmentId),
    item,
  ]));
  const currentUsers = new Map<string, any>(nextUsers.map((item: any) => [String(item.assignmentId), item]));
  const changedUserIds = new Set<string>();

  if (!sameMeaningfulValue(previousGlobal, nextGlobal)) {
    [...previousUsers.values(), ...currentUsers.values()].forEach((item: any) =>
      changedUserIds.add(String(item.userId))
    );
  } else {
    new Set([...previousUsers.keys(), ...currentUsers.keys()]).forEach((assignmentId) => {
      const previous = previousUsers.get(assignmentId);
      const current = currentUsers.get(assignmentId);
      if (!sameMeaningfulValue(
        previous ? normalizePersonalUser(previous) : null,
        current ? normalizePersonalUser(current) : null
      )) {
        if (previous) changedUserIds.add(String((previous as any).userId));
        if (current) changedUserIds.add(String((current as any).userId));
      }
    });
  }

  return { action, mode: "personal", targetUserIds: Array.from(changedUserIds).sort() };
}

function ensureWebProject(project: { platform?: string[] }) {
  const platforms = (project.platform || []).map((value) => value.toLowerCase());
  if (!platforms.some((value) => value.includes("web"))) {
    throw new AppError("DevOps information is currently supported only for web projects", HTTP_STATUS.BAD_REQUEST);
  }
}

type RevealedAccount = {
  authenticationMethod: "username_password" | "username_password_otp";
  username: string;
  password: string;
  otp?: { type?: string; deliveryMethod?: string; instructions?: string };
};

type RevealedEndpoint = {
  id: string;
  url?: string;
  ipAddress?: string;
  port?: number;
  description?: string;
  authenticationAccounts: RevealedAccount[];
};

function revealEndpoints(items: any[] = []): RevealedEndpoint[] {
  return items.map((endpoint) => ({
    id: endpoint.clientId,
    url: endpoint.url,
    ipAddress: endpoint.ipAddress,
    port: endpoint.port,
    description: endpoint.description,
    authenticationAccounts: (endpoint.authenticationAccounts || []).map((account: any) => ({
      authenticationMethod: account.authenticationMethod,
      username: account.username,
      password: decryptSecret(account.password),
      // OTP seed values are deliberately never returned. Delivery guidance is safe to expose.
      otp: account.otp
        ? {
            type: account.otp.type,
            deliveryMethod: account.otp.deliveryMethod,
            instructions: account.otp.instructions,
          }
        : undefined,
    })),
  }));
}

export function buildProjectDevopsAccessView(
  stored: any,
  actorId: string,
  ownAssignmentIds: Set<string>
) {
  if (!stored || ownAssignmentIds.size === 0) return null;

  if (stored.deploymentMode === "shared_vm") {
    return {
      mode: "shared" as const,
      assignmentState: "available" as const,
      endpoints: revealEndpoints(stored.sharedVm?.endpoints || []),
      updatedAt: stored.updatedAt,
    };
  }

  const personal = (stored.separateVm?.users || []).find(
    (item: any) =>
      String(item.userId) === actorId && ownAssignmentIds.has(String(item.assignmentId))
  );
  if (!personal) {
    return {
      mode: "personal" as const,
      assignmentState: "unassigned" as const,
      endpoints: [],
      updatedAt: stored.updatedAt,
    };
  }

  return {
    mode: "personal" as const,
    assignmentState: "available" as const,
    serverIpAddress: stored.separateVm?.serverIpAddress,
    serverPort: stored.separateVm?.serverPort,
    vmIpAddress: personal.vmIpAddress,
    vmPort: personal.vmPort,
    username: personal.serverUsername,
    password: decryptSecret(personal.serverPassword),
    endpoints: revealEndpoints(personal.endpoints || []),
    updatedAt: stored.updatedAt,
  };
}

export async function getProjectDevopsWorkspace(projectId: string, actor: Express.UserContext) {
  const project = await ProjectModel.findById(projectId).lean();
  if (!project) throw new AppError("Project not found", HTTP_STATUS.NOT_FOUND);

  const [assignments, pentesterAssignments, stored] = await Promise.all([
    ProjectAssignmentModel.find({
      $or: [{ projectId }, { project: projectId }],
      status: { $nin: INACTIVE_PROJECT_ASSIGNMENT_STATUSES },
    }).lean(),
    ProjectAssignmentModel.find({
      $and: [
        { $or: [{ projectId }, { project: projectId }] },
        { status: { $nin: INACTIVE_PROJECT_ASSIGNMENT_STATUSES } },
        { $or: [
          { assignmentRole: PROJECT_ASSIGNMENT_ROLES.PENTESTER },
          { assignmentRole: { $exists: false } },
          { assignmentRole: null },
        ] },
      ],
    }).lean(),
    ProjectDevopsInfoModel.findOne({ projectId }).lean(),
  ]);
  const preferredAssignmentIds = new Set(
    (stored?.separateVm?.users || []).map((item) => String(item.assignmentId))
  );
  const candidatePentesterAssignments = selectCurrentPentesterAssignments(
    pentesterAssignments,
    preferredAssignmentIds
  );
  const assignedUserIds = candidatePentesterAssignments.flatMap((item) => {
    const value = item.userId || item.pentester;
    return value ? [String(value)] : [];
  });
  const users = await UserModel.find({
    _id: { $in: assignedUserIds },
    isActive: { $ne: false },
    status: { $nin: ["Inactive", "inactive"] },
  })
    .select("firstName lastName username")
    .lean();
  const identities = new Map(users.map((user) => [String(user._id), user]));
  const currentUserAssignments = candidatePentesterAssignments.filter((assignment) =>
    identities.has(String(assignment.userId || assignment.pentester))
  );
  const assignedUsers = currentUserAssignments.map((assignment) => {
    const userId = String(assignment.userId || assignment.pentester);
    const user = identities.get(userId);
    return {
      assignmentId: String(assignment._id), userId,
      fullName: user ? `${user.firstName} ${user.lastName}` : "Removed user",
      username: user?.username || "-", role: assignment.assignmentRole,
    };
  });

  const canManage = actor.permissions.includes("devops.deployments.update.assigned" as any) || actor.permissions.includes("admin.system.manage.all" as any);
  const ownAssignmentIds = new Set(assignments.filter((item) => String(item.userId || item.pentester) === actor.id).map((item) => String(item._id)));
  if (!canManage && ownAssignmentIds.size === 0) {
    throw new AppError("Forbidden: active project assignment required", HTTP_STATUS.FORBIDDEN);
  }
  const visibleAssignedUsers = canManage ? assignedUsers : assignedUsers.filter((item) => item.userId === actor.id);
  if (!stored) return { projectId, assignedUsers: visibleAssignedUsers, info: null, access: null };
  const masked = (value: any) => value ? { isSet: true } : { isSet: false };
  const endpoints = (items: any[] = []) => items.map((endpoint) => ({
    id: endpoint.clientId, url: endpoint.url, ipAddress: endpoint.ipAddress, port: endpoint.port, description: endpoint.description,
    authenticationAccounts: endpoint.authenticationAccounts.map((account: any) => ({
      id: account.clientId, authenticationMethod: account.authenticationMethod, username: account.username,
      password: masked(account.password), otp: account.otp ? { type: account.otp.type, secret: masked(account.otp.secret), deliveryMethod: account.otp.deliveryMethod, instructions: account.otp.instructions } : undefined,
    })),
  }));
  const currentAssignmentByUserId = new Map(currentUserAssignments.map((assignment) => [
    String(assignment.userId || assignment.pentester),
    assignment,
  ]));
  const allUserInfo = Array.from(new Map((stored.separateVm?.users || []).flatMap((item) => {
    const userId = String(item.userId);
    const assignment = currentAssignmentByUserId.get(userId);
    return assignment ? [[userId, { ...item, assignmentId: assignment._id }]] : [];
  })).values());
  const visibleUserInfo = canManage ? allUserInfo : allUserInfo.filter((item) => ownAssignmentIds.has(String(item.assignmentId)));
  return {
    projectId,
    assignedUsers: visibleAssignedUsers,
    access: buildProjectDevopsAccessView(stored, actor.id, ownAssignmentIds),
    info: {
      deploymentMode: stored.deploymentMode,
      sharedVm: stored.sharedVm ? { endpoints: endpoints(stored.sharedVm.endpoints) } : undefined,
      separateVm: stored.separateVm ? {
        serverIpAddress: stored.separateVm.serverIpAddress, serverPort: stored.separateVm.serverPort,
        vmUsername: stored.separateVm.vmUsername, vmPassword: masked(stored.separateVm.vmPassword),
        users: visibleUserInfo.map((item) => ({ assignmentId: String(item.assignmentId), userId: String(item.userId), serverUsername: item.serverUsername, serverPassword: masked(item.serverPassword), vmIpAddress: item.vmIpAddress, vmPort: item.vmPort, endpoints: endpoints(item.endpoints) })),
      } : undefined,
      updatedAt: stored.updatedAt,
    },
  };
}

export async function saveProjectDevopsInfo(projectId: string, input: DevopsInfoInput, actorId: string) {
  const project = await ProjectModel.findById(projectId).lean();
  if (!project) throw new AppError("Project not found", HTTP_STATUS.NOT_FOUND);
  ensureWebProject(project);
  const existing: any = await ProjectDevopsInfoModel.findOne({ projectId }).lean();
  let replacement: any = { projectId, deploymentMode: input.deploymentMode, updatedById: actorId };

  if (input.deploymentMode === "shared_vm") {
    replacement.sharedVm = { endpoints: mapEndpoints(input.sharedVm!.endpoints, existing?.sharedVm?.endpoints) };
  } else {
    const assignments = await ProjectAssignmentModel.find({
      $and: [
        { $or: [{ projectId }, { project: projectId }] },
        { status: { $nin: INACTIVE_PROJECT_ASSIGNMENT_STATUSES } },
        { $or: [
          { assignmentRole: PROJECT_ASSIGNMENT_ROLES.PENTESTER },
          { assignmentRole: { $exists: false } },
          { assignmentRole: null },
        ] },
      ],
    }).lean();
    const targetUserIds = Array.from(new Set(input.separateVm!.users.map((user) => user.userId)));
    const activeUsers = targetUserIds.length
      ? await UserModel.find({
          _id: { $in: targetUserIds },
          isActive: { $ne: false },
          status: { $nin: ["Inactive", "inactive"] },
        }).select("_id").lean()
      : [];
    assertPersonalDevopsTargetsAreCurrentAssignments(
      input.separateVm!.users,
      assignments,
      new Set(activeUsers.map((user) => String(user._id)))
    );
    const priorUsers = new Map((existing?.separateVm?.users || []).map((item: any) => [String(item.assignmentId), item]));
    const priorUsersByUserId = new Map((existing?.separateVm?.users || []).map((item: any) => [String(item.userId), item]));
    replacement.separateVm = {
      serverIpAddress: input.separateVm!.serverIpAddress, serverPort: input.separateVm!.serverPort,
      vmUsername: input.separateVm!.vmUsername, vmPassword: secret(input.separateVm!.vmPassword, existing?.separateVm?.vmPassword),
      users: input.separateVm!.users.map((user) => {
        const prior: any = priorUsers.get(user.assignmentId) || priorUsersByUserId.get(user.userId);
        return { assignmentId: user.assignmentId, userId: user.userId, serverUsername: user.serverUsername, serverPassword: secret(user.serverPassword, prior?.serverPassword), vmIpAddress: user.vmIpAddress, vmPort: user.vmPort, endpoints: mapEndpoints(user.endpoints, prior?.endpoints) };
      }),
    };
  }

  const change = detectDevopsNotificationChange(existing, replacement);
  if (!change && existing) return existing;
  const notification: DevopsNotificationRequest | null = change
    ? {
        projectId,
        projectName: project.projectName,
        mode: change.mode,
        action: change.action,
        actorUserId: actorId,
        operationId: randomUUID(),
        targetUserIds: change.targetUserIds,
      }
    : null;
  return saveDevopsInfoAndNotify({
    save: () => ProjectDevopsInfoModel.findOneAndReplace(
      { projectId },
      replacement,
      { upsert: true, new: true, runValidators: true }
    ),
    notification,
  });
}
