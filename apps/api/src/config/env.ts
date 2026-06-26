import dotenv from "dotenv";
import { DEFAULT_CORS_ORIGINS } from "@/constants/cors";

dotenv.config();

const nodeEnv = process.env.NODE_ENV || "development";
const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
const clientUrls = process.env.CLIENT_URLS
  ? process.env.CLIENT_URLS.split(",").map((url) => url.trim().replace(/\/$/, "")).filter(Boolean)
  : nodeEnv === "production"
    ? [clientUrl]
    : DEFAULT_CORS_ORIGINS;

function requiredSecret(name: string, fallback: string) {
  const value = process.env[name] || fallback;

  if (nodeEnv === "production" && value === fallback) {
    throw new Error(`${name} must be configured in production`);
  }

  return value;
}

export const env = {
  nodeEnv,
  host: process.env.HOST || "0.0.0.0",
  port: Number(process.env.PORT || 4000),
  clientUrl,
  clientUrls: Array.from(new Set(clientUrls)),
  mongoUri: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/enterprise_dashboard",
  jwtAccessSecret: requiredSecret("JWT_ACCESS_SECRET", "dev_access_secret"),
  jwtRefreshSecret: requiredSecret("JWT_REFRESH_SECRET", "dev_refresh_secret"),
  csrfSecret: requiredSecret("CSRF_SECRET", process.env.JWT_REFRESH_SECRET || "dev_csrf_secret"),
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL || "15m",
  refreshTokenTtl: process.env.REFRESH_TOKEN_TTL || "7d",
  cookieDomain: process.env.COOKIE_DOMAIN || undefined,
  uploadDir: process.env.UPLOAD_DIR || "uploads",
};

export const isProduction = env.nodeEnv === "production";
