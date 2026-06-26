import bcrypt from "bcryptjs";
import { HTTP_STATUS } from "@/constants/http";
import { ROLES } from "@/constants/roles";
import type { Role } from "@/constants/roles";
import { UserModel } from "@/modules/users/models/user.model";
import { getDefaultPermissionsForRoles, toAuthUserContext, upsertUserPermissions } from "@/modules/users/services/userAuth.service";
import { AppError } from "@/utils/AppError";
import { issueSessionTokens } from "./session.service";

type AuthRequestContext = {
  ip?: string;
  userAgent?: string;
};

export async function registerUser(
  input: {
    firstName?: string;
    lastName?: string;
    username: string;
    password: string;
    avatarUrl?: string;
    roles?: Role[];
  },
  context?: AuthRequestContext
) {
  const exists = await UserModel.exists({ username: input.username });
  if (exists) throw new AppError("User already exists", HTTP_STATUS.CONFLICT);

  const password = await bcrypt.hash(input.password, 12);
  const user = await UserModel.create({
    firstName: input.firstName,
    lastName: input.lastName,
    username: input.username,
    password,
    avatarUrl: input.avatarUrl,
    roles: input.roles,
  });

  await upsertUserPermissions(user._id.toString(), await getDefaultPermissionsForRoles(user.roles as Role[]));

  const authUser = await toAuthUserContext(user);
  return {
    user: authUser,
    ...(await issueSessionTokens(authUser, context)),
  };
}

export async function registerAdminUser(
  input: {
    firstName?: string;
    lastName?: string;
    username: string;
    password: string;
    avatarUrl?: string;
  },
  context?: AuthRequestContext
) {
  return registerUser(
    {
      ...input,
      roles: [ROLES.ADMIN],
    },
    context
  );
}

export async function loginUser(
  input: { username: string; password: string },
  context?: AuthRequestContext
) {
  const user = await UserModel.findOne({ username: input.username }).select("+password");

  if (!user || user.status === "Inactive" || user.isActive === false) {
    throw new AppError("Invalid username or password", HTTP_STATUS.UNAUTHORIZED);
  }

  const valid = user.password ? await bcrypt.compare(input.password, user.password) : false;
  if (!valid) throw new AppError("Invalid username or password", HTTP_STATUS.UNAUTHORIZED);

  const authUser = await toAuthUserContext(user);
  return {
    user: authUser,
    ...(await issueSessionTokens(authUser, context)),
  };
}
