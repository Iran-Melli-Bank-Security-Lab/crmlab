export const DEFAULT_CORS_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:4173",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:4173",
  "http://[::1]:5173",
  "http://172.20.10.12:5173", 
] as const;

function isPrivateLanHostname(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("10.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  );
}

export function isAllowedDevelopmentOrigin(origin?: string) {
  if (!origin) return true;

  try {
    const parsedOrigin = new URL(origin);

    if (!["http:", "https:"].includes(parsedOrigin.protocol)) {
      return false;
    }

    return isPrivateLanHostname(parsedOrigin.hostname);
  } catch {
    return false;
  }
}