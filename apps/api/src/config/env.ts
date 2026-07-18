import dotenv from "dotenv";
import { DEFAULT_CORS_ORIGINS } from "@/constants/cors";

const runtimeNodeEnv = process.env.NODE_ENV;

// PM2 retains environment variables across reloads. In production this project
// intentionally uses apps/api/.env as its deployment configuration, so let that
// file replace stale values inherited by the PM2 daemon. Keep NODE_ENV owned by
// the process manager so an old .env file cannot disable production safeguards.
dotenv.config({
  quiet: true,
  override: runtimeNodeEnv === "production",
});
if (runtimeNodeEnv) process.env.NODE_ENV = runtimeNodeEnv;

const nodeEnv = runtimeNodeEnv || process.env.NODE_ENV || "development";
const isProductionEnvironment = nodeEnv === "production";

function productionValue(name: string, fallback: string) {
  const value = process.env[name] || fallback;

  if (isProductionEnvironment && !process.env[name]) {
    throw new Error(`${name} must be configured in production`);
  }

  return value;
}

function parseBoolean(name: string, fallback: boolean) {
  const value = process.env[name];
  if (value === undefined) return fallback;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`${name} must be either true or false`);
}

function parseOrigin(value: string, name: string) {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol) || url.pathname !== "/") {
      throw new Error();
    }
    return url.origin;
  } catch {
    throw new Error(`${name} must contain valid HTTP(S) origins without paths`);
  }
}

const clientUrl = parseOrigin(
  productionValue("CLIENT_URL", "http://localhost:5173"),
  "CLIENT_URL"
);
const clientUrls = process.env.CLIENT_URLS
  ? process.env.CLIENT_URLS.split(",")
      .map((url) => url.trim())
      .filter(Boolean)
      .map((url) => parseOrigin(url, "CLIENT_URLS"))
  : isProductionEnvironment
    ? [clientUrl]
    : DEFAULT_CORS_ORIGINS;

function requiredSecret(name: string, fallback: string) {
  const value = process.env[name] || fallback;
  const isPlaceholder = /replace-with|change-me/i.test(value);

  if (
    isProductionEnvironment &&
    (!process.env[name] || value.length < 32 || isPlaceholder)
  ) {
    throw new Error(`${name} must be configured with at least 32 characters in production`);
  }

  return value;
}

const port = Number(process.env.PORT || 4000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535");
}

const cookieSecure = parseBoolean("COOKIE_SECURE", isProductionEnvironment);
const cookieSameSite = process.env.COOKIE_SAME_SITE || "lax";
if (!["lax", "strict", "none"].includes(cookieSameSite)) {
  throw new Error("COOKIE_SAME_SITE must be lax, strict, or none");
}
if (cookieSameSite === "none" && !cookieSecure) {
  throw new Error("COOKIE_SECURE must be true when COOKIE_SAME_SITE is none");
}

const trustProxy = Number(
  process.env.TRUST_PROXY_HOPS || (isProductionEnvironment ? 1 : 0)
);
if (!Number.isInteger(trustProxy) || trustProxy < 0) {
  throw new Error("TRUST_PROXY_HOPS must be a non-negative integer");
}

const host = process.env.HOST || "0.0.0.0";
if (
  isProductionEnvironment &&
  ["localhost", "127.0.0.1", "::1"].includes(host)
) {
  throw new Error("HOST must bind to a non-loopback interface in production");
}

export const env = {
  nodeEnv,
  host,
  port,
  clientUrl,
  clientUrls: Array.from(new Set(clientUrls)),
  mongoUri: productionValue(
    "MONGO_URI",
    "mongodb://127.0.0.1:27017/test"
  ),
  legacyDatabaseName: process.env.LEGACY_DATABASE_NAME || "test",
  jwtAccessSecret: requiredSecret("JWT_ACCESS_SECRET", "dev_access_secret"),
  jwtRefreshSecret: requiredSecret("JWT_REFRESH_SECRET", "dev_refresh_secret"),
  csrfSecret: requiredSecret("CSRF_SECRET", "dev_csrf_secret"),
  credentialEncryptionKey: requiredSecret(
    "CREDENTIAL_ENCRYPTION_KEY",
    "dev_credential_encryption_key"
  ),
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL || "15m",
  refreshTokenTtl: process.env.REFRESH_TOKEN_TTL || "7d",
  cookieDomain: process.env.COOKIE_DOMAIN || undefined,
  cookieSecure,
  cookieSameSite: cookieSameSite as "lax" | "strict" | "none",
  trustProxy,
  uploadDir: process.env.UPLOAD_DIR || "uploads",
};

export const isProduction = env.nodeEnv === "production";
