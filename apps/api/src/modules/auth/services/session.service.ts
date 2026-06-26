import crypto from "crypto";
import jwt from "jsonwebtoken";
import { UserModel } from "@/modules/users/models/user.model";
import { toAuthUserContext } from "@/modules/users/services/userAuth.service";
import { HTTP_STATUS } from "@/constants/http";
import { AppError } from "@/utils/AppError";
import { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } from "@/utils/jwt";
import { AuthSessionModel } from "../models/authSession.model";

type SessionContext = {
  ip?: string;
  userAgent?: string;
};

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function getJwtExpiry(token: string) {
  const decoded = jwt.decode(token);

  if (decoded && typeof decoded === "object" && typeof decoded.exp === "number") {
    return new Date(decoded.exp * 1000);
  }

  throw new AppError("Invalid refresh token expiry", HTTP_STATUS.UNAUTHORIZED);
}

export async function issueSessionTokens(authUser: Express.UserContext, context: SessionContext = {}) {
  const tokenId = crypto.randomUUID();
  const refreshToken = signRefreshToken({
    id: authUser.id,
    sessionVersion: authUser.sessionVersion,
    tokenId,
  });

  await AuthSessionModel.create({
    userId: authUser.id,
    tokenId,
    refreshTokenHash: hashToken(refreshToken),
    sessionVersion: authUser.sessionVersion,
    userAgent: context.userAgent,
    ip: context.ip,
    expiresAt: getJwtExpiry(refreshToken),
  });

  return {
    accessToken: signAccessToken({
      id: authUser.id,
      sessionVersion: authUser.sessionVersion,
    }),
    refreshToken,
  };
}

async function getActiveAuthUser(userId: string) {
  const user = await UserModel.findById(userId);

  if (!user || !user.isActive) {
    throw new AppError("Unauthorized", HTTP_STATUS.UNAUTHORIZED);
  }

  return toAuthUserContext(user);
}

function assertCurrentSession(authUser: Express.UserContext, tokenSessionVersion: number) {
  if (authUser.sessionVersion !== tokenSessionVersion) {
    throw new AppError("Unauthorized", HTTP_STATUS.UNAUTHORIZED);
  }
}

export async function getAuthUserFromAccessToken(accessToken: string) {
  const payload = verifyAccessToken(accessToken);
  const authUser = await getActiveAuthUser(payload.id);

  assertCurrentSession(authUser, payload.sessionVersion);

  return authUser;
}

export async function refreshAuthSession(refreshToken?: string) {
  if (!refreshToken) {
    throw new AppError("Unauthorized", HTTP_STATUS.UNAUTHORIZED);
  }

  const payload = verifyRefreshToken(refreshToken);
  const authUser = await getActiveAuthUser(payload.id);

  assertCurrentSession(authUser, payload.sessionVersion);

  const existingSession = await AuthSessionModel.findOne({
    tokenId: payload.tokenId,
    refreshTokenHash: hashToken(refreshToken),
  });

  if (!existingSession || existingSession.revokedAt || existingSession.expiresAt <= new Date()) {
    await AuthSessionModel.updateMany({ userId: payload.id, revokedAt: { $exists: false } }, { revokedAt: new Date() });
    throw new AppError("Unauthorized", HTTP_STATUS.UNAUTHORIZED);
  }

  const newTokens = await issueSessionTokens(authUser, {
    ip: existingSession.ip || undefined,
    userAgent: existingSession.userAgent || undefined,
  });

  existingSession.revokedAt = new Date();
  existingSession.replacedByTokenId = verifyRefreshToken(newTokens.refreshToken).tokenId;
  await existingSession.save();

  return {
    user: authUser,
    ...newTokens,
  };
}

export async function revokeRefreshSession(refreshToken?: string) {
  if (!refreshToken) return;

  try {
    const payload = verifyRefreshToken(refreshToken);
    await AuthSessionModel.updateOne({ tokenId: payload.tokenId }, { revokedAt: new Date() });
  } catch {
    return;
  }
}
