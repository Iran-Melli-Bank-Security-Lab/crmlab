// src/providers/SocketProvider.tsx

import { useEffect, useMemo, useState, type ReactNode } from "react";

import { socket } from "@/shared/realtime/socket.client";
import { SocketContext } from "@/shared/realtime/SocketContext";
import { useAuth } from "@/features/auth/model/useAuth";

type SocketProviderProps = {
  children: ReactNode;
};

export function SocketProvider({ children }: SocketProviderProps) {
  const { isAuthenticated, user } = useAuth();

  const [socketIsConnected, setSocketIsConnected] = useState(() => socket.connected);

  const shouldConnectSocket = isAuthenticated && Boolean(user);

  useEffect(() => {
    function handleConnect() {
      console.log("[socket] connected:", socket.id);
      setSocketIsConnected(true);
    }

    function handleDisconnect(reason: string) {
      console.log("[socket] disconnected:", reason);
      setSocketIsConnected(false);
    }

    function handleConnectError(error: Error) {
      console.log("[socket] connect error:", error.message);
      setSocketIsConnected(false);
    }

    function handleSocketConnected(payload: unknown) {
      console.log("[socket] server welcome:", payload);
    }

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("socket:connected", handleSocketConnected);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("socket:connected", handleSocketConnected);
    };
  }, []);

  useEffect(() => {
    if (shouldConnectSocket) {
      if (!socket.connected) {
        console.log("[socket] connecting after auth...");
        socket.connect();
      }

      return;
    }

    if (socket.connected) {
      console.log("[socket] disconnecting because user is not authenticated");
      socket.disconnect();
    }
  }, [shouldConnectSocket]);

  const contextValue = useMemo(
    () => ({
      socket,
      isConnected: shouldConnectSocket && socketIsConnected,
    }),
    [shouldConnectSocket, socketIsConnected]
  );

  return <SocketContext.Provider value={contextValue}>{children}</SocketContext.Provider>;
}
