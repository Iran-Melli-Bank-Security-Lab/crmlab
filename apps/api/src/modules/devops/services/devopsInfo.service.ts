import { HTTP_STATUS } from "@/constants/http";
import { PROJECT_ASSIGNMENT_STATUS } from "@/constants/projects";
import { ProjectAssignmentModel } from "@/modules/projects/models/projectAssignment.model";
import { ProjectModel } from "@/modules/projects/models/project.model";
import { UserModel } from "@/modules/users/models/user.model";
import { AppError } from "@/utils/AppError";
import { ProjectDevopsInfoModel } from "../models/projectDevopsInfo.model";
import type { DevopsInfoInput } from "../validators/devops.validators";
import { decryptSecret, encryptSecret, type EncryptedSecret } from "./credentialCipher.service";

type SecretInput = { value: string } | { unchanged: true };
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

  const assignments = await ProjectAssignmentModel.find({
    $or: [{ projectId }, { project: projectId }],
    status: { $ne: PROJECT_ASSIGNMENT_STATUS.REMOVED },
  }).lean();
  const assignedUserIds = assignments.map((item) => item.userId || item.pentester).filter((value): value is NonNullable<typeof value> => Boolean(value));
  const users = await UserModel.find({ _id: { $in: assignedUserIds } })
    .select("firstName lastName username roles")
    .lean();
  const identities = new Map(users.map((user) => [String(user._id), user]));
  const assignedUsers = assignments.map((assignment) => {
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
  const stored = await ProjectDevopsInfoModel.findOne({ projectId }).lean();
  if (!stored) return { projectId, assignedUsers: visibleAssignedUsers, info: null, access: null };
  const masked = (value: any) => value ? { isSet: true } : { isSet: false };
  const endpoints = (items: any[] = []) => items.map((endpoint) => ({
    id: endpoint.clientId, url: endpoint.url, ipAddress: endpoint.ipAddress, port: endpoint.port, description: endpoint.description,
    authenticationAccounts: endpoint.authenticationAccounts.map((account: any) => ({
      id: account.clientId, authenticationMethod: account.authenticationMethod, username: account.username,
      password: masked(account.password), otp: account.otp ? { type: account.otp.type, secret: masked(account.otp.secret), deliveryMethod: account.otp.deliveryMethod, instructions: account.otp.instructions } : undefined,
    })),
  }));
  const allUserInfo = stored.separateVm?.users || [];
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
    const assignments = await ProjectAssignmentModel.find({ $or: [{ projectId }, { project: projectId }], status: { $ne: PROJECT_ASSIGNMENT_STATUS.REMOVED } }).lean();
    const valid = new Map(assignments.map((item) => [String(item._id), String(item.userId || item.pentester)]));
    for (const user of input.separateVm!.users) {
      if (valid.get(user.assignmentId) !== user.userId) throw new AppError("A per-user entry does not match an active project assignment", HTTP_STATUS.BAD_REQUEST);
    }
    const priorUsers = new Map((existing?.separateVm?.users || []).map((item: any) => [String(item.assignmentId), item]));
    replacement.separateVm = {
      serverIpAddress: input.separateVm!.serverIpAddress, serverPort: input.separateVm!.serverPort,
      vmUsername: input.separateVm!.vmUsername, vmPassword: secret(input.separateVm!.vmPassword, existing?.separateVm?.vmPassword),
      users: input.separateVm!.users.map((user) => {
        const prior: any = priorUsers.get(user.assignmentId);
        return { assignmentId: user.assignmentId, userId: user.userId, serverUsername: user.serverUsername, serverPassword: secret(user.serverPassword, prior?.serverPassword), vmIpAddress: user.vmIpAddress, vmPort: user.vmPort, endpoints: mapEndpoints(user.endpoints, prior?.endpoints) };
      }),
    };
  }
  return ProjectDevopsInfoModel.findOneAndReplace({ projectId }, replacement, { upsert: true, new: true, runValidators: true });
}
