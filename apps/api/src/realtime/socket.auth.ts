// src/realtime/socket.auth.ts

// import cookie from "cookie";
// import type { RealtimeSocket } from "./socket.types";
// import { COOKIE_NAMES } from "@/constants/security";
// import { getAuthUserFromAccessToken } from "@/modules/auth/services/session.service";

// export async function authenticateSocket(socket: RealtimeSocket): Promise<void> {
//   const rawCookie = socket.handshake.headers.cookie;

//   if (!rawCookie) {
//     throw new Error("Missing authentication cookie");
//   }

//   const parsedCookies = cookie.parse(rawCookie);
//   const accessToken = parsedCookies[COOKIE_NAMES.ACCESS_TOKEN];

//   if (!accessToken) {
//     throw new Error("Missing access token");
//   }

//   const user = await getAuthUserFromAccessToken(accessToken);

//   if (!user) {
//     throw new Error("Invalid or expired token");
//   }

//   socket.data.user = {
//     id: user.id,
//     username: user.username,
//     roles: user.roles,
//     sessionVersion: user.sessionVersion,
//   };
// }

// src/realtime/socket.auth.ts

import { parse as parseCookie } from "cookie";
import type { ExtendedError } from "socket.io";

import { COOKIE_NAMES } from "@/constants/security";
import { getAuthUserFromAccessToken } from "@/modules/auth/services/session.service";
import type { RealtimeSocket } from "./socket.types";

export async function socketAuthMiddleware(
  socket: RealtimeSocket,
  next: (err?: ExtendedError) => void
) {
  try {
    const rawCookie = socket.handshake.headers.cookie;

    console.log("[socket:auth] checking socket auth", {
      socketId: socket.id,
      hasCookie: Boolean(rawCookie),
      origin: socket.handshake.headers.origin,
    });

    if (!rawCookie) {
      return next(new Error("Unauthorized"));
    }

    const parsedCookies = parseCookie(rawCookie);

    const accessToken = parsedCookies[COOKIE_NAMES.ACCESS_TOKEN];

    if (!accessToken) {
      console.log("[socket:auth] access token not found", {
        expectedCookieName: COOKIE_NAMES.ACCESS_TOKEN,
        availableCookieNames: Object.keys(parsedCookies),
      });

      return next(new Error("Unauthorized"));
    }

    const user = await getAuthUserFromAccessToken(accessToken);

    if (!user?.id) {
      console.log("[socket:auth] invalid user");
      return next(new Error("Unauthorized"));
    }

    socket.data.user = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user?.username,
      roles: user?.roles,
      sessionVersion: user?.sessionVersion,
      projectIds: user?.projectIds,
    };

    console.log("[socket:auth] success", {
      socketId: socket.id,
      userId: socket.data.user.id,
      roles: socket.data.user.roles,
    });

    next();
  } catch (error) {
    console.log("[socket:auth] failed", {
      socketId: socket.id,
      error: error instanceof Error ? error.message : error,
    });

    next(new Error("Unauthorized"));
  }
}