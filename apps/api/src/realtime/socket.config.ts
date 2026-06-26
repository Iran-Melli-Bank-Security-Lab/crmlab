// src/realtime/socket.config.ts
import { isAllowedDevelopmentOrigin } from "@/constants/cors";
import { isProduction } from "@/config/env";

const defaultAllowedOrigins = [
  "http://localhost:5173",
  "http://172.20.10.12:5173",
  "http://localhost:3000",
  "https://your-frontend-domain.com",
];

function parseOrigins(value?: string): string[] {
  if (!value) return defaultAllowedOrigins;

  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export const socketConfig = {
  isProduction,

  path: "/socket.io",

  redisUrl: process.env.SOCKET_REDIS_URL || process.env.REDIS_URL,

  allowedOrigins: parseOrigins(process.env.SOCKET_ALLOWED_ORIGINS),

  cors: {
    origin: parseOrigins(process.env.SOCKET_ALLOWED_ORIGINS),
    credentials: true,
    methods: ["GET", "POST"],
  },

  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: false,
  },

  pingInterval: 25_000,
  pingTimeout: 20_000,
  maxHttpBufferSize: 1e6,

  transports: ["websocket", "polling"] as const,
} as const;

export function isAllowedSocketOrigin(origin?: string): boolean {
  if (!origin) {
    return !socketConfig.isProduction;
  }

  try {
    const incomingUrl = new URL(origin);

    const isExplicitlyAllowed = socketConfig.allowedOrigins.some((allowedOrigin) => {
      const allowedUrl = new URL(allowedOrigin);
      return incomingUrl.origin === allowedUrl.origin;
    });

    if (isExplicitlyAllowed) {
      return true;
    }

    if (!socketConfig.isProduction && isAllowedDevelopmentOrigin(origin)) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}