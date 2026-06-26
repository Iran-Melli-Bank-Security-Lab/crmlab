import crypto from "crypto";
import type { Request, RequestHandler, Response } from "express";
import { env } from "@/config/env";
import { HTTP_METHODS, HTTP_STATUS } from "@/constants/http";
import { API_ENDPOINTS } from "@/constants/routes";
import { BODY_FIELDS, COOKIE_NAMES, SECURITY_HEADERS } from "@/constants/security";
import { AppError } from "@/utils/AppError";
import { clearCsrfCookie, csrfCookieName, setCsrfCookie } from "@/utils/cookies";
import { sendSuccess } from "@/utils/response";

const tokenEncoding = "base64url";
const safeMethods = new Set<string>([HTTP_METHODS.GET, HTTP_METHODS.HEAD, HTTP_METHODS.OPTIONS]);
const publicUnsafeRoutes = new Set([
  `${HTTP_METHODS.POST} ${API_ENDPOINTS.AUTH_LOGIN}`,
  `${HTTP_METHODS.POST} ${API_ENDPOINTS.AUTH_REGISTER}`,
]);

function createSecret() {
  return crypto.randomBytes(32).toString(tokenEncoding);
}

function signSecret(secret: string) {
  return crypto.createHmac("sha256", env.csrfSecret).update(secret).digest(tokenEncoding);
}

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function getTokenFromRequest(req: Request) {
  const headerValue = req.get(SECURITY_HEADERS.CSRF_TOKEN);

  if (headerValue) return headerValue;
  if (typeof req.body?.[BODY_FIELDS.CSRF_TOKEN] === "string") return req.body[BODY_FIELDS.CSRF_TOKEN];

  return undefined;
}

function requestUsesAuthCookies(req: Request) {
  return Boolean(req.cookies?.[COOKIE_NAMES.ACCESS_TOKEN] || req.cookies?.[COOKIE_NAMES.REFRESH_TOKEN]);
}

function isPublicUnsafeRoute(req: Request) {
  return publicUnsafeRoutes.has(`${req.method} ${req.path}`);
}

export function createCsrfToken(res: Response, existingSecret?: string) {
  const secret = existingSecret || createSecret();
  const csrfToken = signSecret(secret);

  setCsrfCookie(res, secret);

  return csrfToken;
}

export const csrfTokenHandler: RequestHandler = (req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  const csrfToken = createCsrfToken(res, req.cookies?.[csrfCookieName]);

  sendSuccess(res, { csrfToken });
};

export const csrfProtection: RequestHandler = (req, res, next) => {
  if (safeMethods.has(req.method) || isPublicUnsafeRoute(req) || !requestUsesAuthCookies(req)) {
    return next();
  }

  const secret = req.cookies?.[csrfCookieName];
  const token = getTokenFromRequest(req);

  if (!secret || !token || !safeCompare(signSecret(secret), token)) {
    clearCsrfCookie(res);
    return next(new AppError("Invalid CSRF token", HTTP_STATUS.FORBIDDEN));
  }

  return next();
};
