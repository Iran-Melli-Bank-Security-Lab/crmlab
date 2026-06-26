// src/contexts/SocketContext.ts

import { createContext } from "react";
import type { Socket } from "socket.io-client";

export type SocketContextValue = {
  socket: Socket;
  isConnected: boolean;
};

export const SocketContext = createContext<SocketContextValue | null>(null);
