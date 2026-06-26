// src/hooks/useSocket.ts

import { useContext } from "react";
import { SocketContext } from "@/shared/realtime/SocketContext";

export function useSocket() {
  const context = useContext(SocketContext);

  if (!context) {
    throw new Error("useSocket must be used inside SocketProvider");
  }

  return context;
}
