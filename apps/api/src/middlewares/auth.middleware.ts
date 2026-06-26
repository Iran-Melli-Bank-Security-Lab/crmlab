import type { RequestHandler } from "express";
import { HTTP_STATUS } from "@/constants/http";
import { COOKIE_NAMES } from "@/constants/security";
import { AppError } from "@/utils/AppError";
import { setAuthCookies, clearAuthCookies } from "@/utils/cookies";
import { getAuthUserFromAccessToken, refreshAuthSession } from "@/modules/auth/services/session.service";

export const requireAuth: RequestHandler = async (req, res, next) => {
  try {
    const accessToken = req.cookies?.[COOKIE_NAMES.ACCESS_TOKEN];

    if (accessToken) {
      req.user = await getAuthUserFromAccessToken(accessToken);
      return next();
    }

    const refreshToken = req.cookies?.[COOKIE_NAMES.REFRESH_TOKEN];
    if (!refreshToken) {
      throw new AppError("Unauthorized", HTTP_STATUS.UNAUTHORIZED);
    }

    const session = await refreshAuthSession(refreshToken);
    setAuthCookies(res, session.accessToken, session.refreshToken);

    req.user = session.user;
    next();
  } catch {
    clearAuthCookies(res);
    next(new AppError("Unauthorized", HTTP_STATUS.UNAUTHORIZED));
  }
};
