function getBrowserOrigin() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.location.origin;
}

function removeTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export const API_BASE_URL = removeTrailingSlash(
  import.meta.env.VITE_API_BASE_URL || "/api"
);

export const SOCKET_URL = removeTrailingSlash(
  import.meta.env.VITE_SOCKET_URL || getBrowserOrigin()
);

export const SOCKET_PATH = import.meta.env.VITE_SOCKET_PATH || "/socket.io";