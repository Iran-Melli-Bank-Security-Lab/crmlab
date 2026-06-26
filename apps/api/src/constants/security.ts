export const COOKIE_NAMES = {
  ACCESS_TOKEN: "accessToken",
  REFRESH_TOKEN: "refreshToken",
  CSRF_SECRET: "csrfSecret",
} as const;

export const SECURITY_HEADERS = {
  CSRF_TOKEN: "x-csrf-token",
} as const;

export const BODY_FIELDS = {
  CSRF_TOKEN: "csrfToken",
} as const;
