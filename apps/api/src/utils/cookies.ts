import type { Response } from "express";
import { env, isProduction } from "@/config/env";
import { COOKIE_NAMES } from "@/constants/security";

const baseCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? ("none" as const) : ("lax" as const),
  domain: env.cookieDomain,
  path: "/",
};

export const csrfCookieName = COOKIE_NAMES.CSRF_SECRET;

export function getCsrfCookieOptions() {
  return {
    ...baseCookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie(COOKIE_NAMES.ACCESS_TOKEN, accessToken, {
    ...baseCookieOptions,
    maxAge: 15 * 60 * 1000,
  });

  res.cookie(COOKIE_NAMES.REFRESH_TOKEN, refreshToken, {
    ...baseCookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function setCsrfCookie(res: Response, csrfSecret: string) {
  res.cookie(csrfCookieName, csrfSecret, getCsrfCookieOptions());
}

export function clearAuthCookies(res: Response) {
  res.clearCookie(COOKIE_NAMES.ACCESS_TOKEN, baseCookieOptions);
  res.clearCookie(COOKIE_NAMES.REFRESH_TOKEN, baseCookieOptions);
}

export function clearCsrfCookie(res: Response) {
  res.clearCookie(csrfCookieName, baseCookieOptions);
}
