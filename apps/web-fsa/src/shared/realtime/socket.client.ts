// src/realtime/socket.client.ts

import { io } from "socket.io-client";
import { SOCKET_PATH, SOCKET_URL } from "@/shared/config/backend";

export const socket = io(SOCKET_URL, {
  path: SOCKET_PATH,
  withCredentials: true,
  autoConnect: false,
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 800,
  reconnectionDelayMax: 8000,
  timeout: 12000,
});
