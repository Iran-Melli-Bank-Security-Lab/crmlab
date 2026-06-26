const DEFAULT_BACKEND_PORT = "4000";

function getRuntimeBackendOrigin() {
  const protocol =
    import.meta.env.VITE_BACKEND_PROTOCOL ||
    (typeof window !== "undefined" ? window.location.protocol : "http:");

  const hostname =
    import.meta.env.VITE_BACKEND_HOST ||
    (typeof window !== "undefined" ? window.location.hostname : "localhost");

  const port = import.meta.env.VITE_BACKEND_PORT || DEFAULT_BACKEND_PORT;

  return `${protocol}//${hostname}:${port}`;
}

function removeTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

const backendOrigin = removeTrailingSlash(
  import.meta.env.VITE_BACKEND_ORIGIN || getRuntimeBackendOrigin()
);

export const API_BASE_URL = removeTrailingSlash(
  import.meta.env.VITE_API_BASE_URL || `${backendOrigin}/api`
);

export const SOCKET_URL = removeTrailingSlash(
  import.meta.env.VITE_SOCKET_URL || backendOrigin
);

export const SOCKET_PATH = import.meta.env.VITE_SOCKET_PATH || "/socket.io";