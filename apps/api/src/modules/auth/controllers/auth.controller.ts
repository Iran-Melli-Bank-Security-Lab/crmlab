import type { RequestHandler } from "express";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "@/constants/audit";
import { HTTP_STATUS } from "@/constants/http";
import { COOKIE_NAMES } from "@/constants/security";
import { createCsrfToken } from "@/middlewares/csrf.middleware";
import { writeAuditLog } from "@/modules/audit/services/audit.service";
import { clearAuthCookies, clearCsrfCookie, setAuthCookies } from "@/utils/cookies";
import { sendMessage, sendSuccess } from "@/utils/response";
import { loginUser, registerAdminUser, registerUser } from "../services/auth.service";
import { refreshAuthSession, revokeRefreshSession } from "../services/session.service";
import { UserModel } from "@/modules/users/models/user.model";
import { AppError } from "@/utils/AppError";
import { toAuthUserContext } from "@/modules/users/services/userAuth.service";

export const register: RequestHandler = async (req, res, next) => {
  try {
    const { user, accessToken, refreshToken } = await registerUser(req.body, {
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });
    setAuthCookies(res, accessToken, refreshToken);
    const csrfToken = createCsrfToken(res);
    await writeAuditLog({
      req,
      actorId: user.id,
      action: AUDIT_ACTIONS.AUTH_REGISTER,
      entityType: AUDIT_ENTITY_TYPES.USER,
      entityId: user.id,
    });
    sendSuccess(res, { user, csrfToken }, HTTP_STATUS.CREATED);
  } catch (error) {
    next(error);
  }
};

export const registerAdmin: RequestHandler = async (req, res, next) => {
  try {
    const { user, accessToken, refreshToken } = await registerAdminUser(req.body, {
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });
    setAuthCookies(res, accessToken, refreshToken);
    const csrfToken = createCsrfToken(res);
    await writeAuditLog({
      req,
      actorId: user.id,
      action: AUDIT_ACTIONS.AUTH_REGISTER,
      entityType: AUDIT_ENTITY_TYPES.USER,
      entityId: user.id,
      metadata: { bootstrapRole: "admin" },
    });
    sendSuccess(res, { user, csrfToken }, HTTP_STATUS.CREATED);
  } catch (error) {
    next(error);
  }
};

export const login: RequestHandler = async (req, res, next) => {
  try {
    const { user, accessToken, refreshToken } = await loginUser(req.body, {
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });
    setAuthCookies(res, accessToken, refreshToken);
    const csrfToken = createCsrfToken(res);
    await writeAuditLog({
      req,
      actorId: user.id,
      action: AUDIT_ACTIONS.AUTH_LOGIN,
      entityType: AUDIT_ENTITY_TYPES.SESSION,
      entityId: user.id,
    });
    sendSuccess(res, { user, csrfToken });
  } catch (error) {
    next(error);
  }
};

export const me: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", HTTP_STATUS.UNAUTHORIZED);
    const user = await UserModel.findById(req.user.id);
    if (!user) throw new AppError("Unauthorized", HTTP_STATUS.UNAUTHORIZED);
    sendSuccess(res, await toAuthUserContext(user));
  } catch (error) {
    next(error);
  }
};

export const refreshToken: RequestHandler = async (req, res, next) => {
  try {
    const session = await refreshAuthSession(req.cookies?.[COOKIE_NAMES.REFRESH_TOKEN]);
    setAuthCookies(res, session.accessToken, session.refreshToken);
    const csrfToken = createCsrfToken(res);

    await writeAuditLog({
      req,
      actorId: session.user.id,
      action: AUDIT_ACTIONS.AUTH_REFRESH,
      entityType: AUDIT_ENTITY_TYPES.SESSION,
      entityId: session.user.id,
    });

    sendSuccess(res, { user: session.user, csrfToken });
  } catch (error) {
    clearAuthCookies(res);
    clearCsrfCookie(res);
    next(error);
  }
};

export const logout: RequestHandler = async (req, res) => {
  await revokeRefreshSession(req.cookies?.[COOKIE_NAMES.REFRESH_TOKEN]);
  await writeAuditLog({
    req,
    action: AUDIT_ACTIONS.AUTH_LOGOUT,
    entityType: AUDIT_ENTITY_TYPES.SESSION,
    entityId: req.user?.id,
  });
  clearAuthCookies(res);
  clearCsrfCookie(res);
  sendMessage(res, "Logged out");
};
