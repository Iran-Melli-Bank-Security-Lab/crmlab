// src/realtime/socket.errors.ts

export class SocketAppError extends Error {
  public readonly code: string;
  public readonly publicMessage: string;

  constructor(code: string, publicMessage: string) {
    super(publicMessage);
    this.code = code;
    this.publicMessage = publicMessage;
  }
}

export class SocketAuthError extends SocketAppError {
  constructor(message = "Authentication failed") {
    super("SOCKET_AUTH_FAILED", message);
  }
}

export class SocketForbiddenError extends SocketAppError {
  constructor(message = "Forbidden") {
    super("SOCKET_FORBIDDEN", message);
  }
}

export class SocketRateLimitError extends SocketAppError {
  constructor(message = "Too many socket events") {
    super("SOCKET_RATE_LIMITED", message);
  }
}

export function normalizeSocketError(error: unknown) {
  if (error instanceof SocketAppError) {
    return {
      code: error.code,
      message: error.publicMessage,
    };
  }

  return {
    code: "SOCKET_INTERNAL_ERROR",
    message: "Internal socket error",
  };
}