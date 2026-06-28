import { socket } from "@/shared/realtime/socket.client";
import { SOCKET_PATH, SOCKET_URL } from "@/shared/config/backend";
import type { AppNotification } from "@/entities/notification/model/notification";

type NotificationSocketHandlers = {
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onError?: (message: string) => void;
  onNotification?: (notification: AppNotification) => void;
  onNotificationUpdated?: (notification: AppNotification) => void;
  onNotificationRead?: (id: string) => void;
  onNotificationsReadAll?: () => void;
  onNotificationDeleted?: (id: string) => void;
  onNotificationsSync?: (notifications: AppNotification[]) => void;
  onUnreadCount?: (count: number) => void;
  onProjectEvent?: (event: "project:created" | "project:assigned", payload: unknown) => void;
};

type ConnectOptions = {
  userId: string;
  roles: string[];
};

class NotificationSocket {
  private removeListeners?: () => void;

  connect(options: ConnectOptions, handlers: NotificationSocketHandlers) {
    this.detachListeners();

    const handleConnect = () => {
      handlers.onConnect?.();
      socket.emit("notifications:subscribe", {
        userId: options.userId,
        roles: options.roles,
      });
    };
    const handleDisconnect = (reason: string) => handlers.onDisconnect?.(reason);
    const handleConnectError = (error: Error) => handlers.onError?.(error.message);
    const handleNotificationNew = (notification: AppNotification) =>
      handlers.onNotification?.(notification);
    const handleNotificationUpdated = (notification: AppNotification) =>
      handlers.onNotificationUpdated?.(notification);
    const handleNotificationRead = (payload: { id: string }) =>
      handlers.onNotificationRead?.(payload.id);
    const handleNotificationsReadAll = () => handlers.onNotificationsReadAll?.();
    const handleNotificationDeleted = (payload: { id: string }) =>
      handlers.onNotificationDeleted?.(payload.id);
    const handleNotificationsSync = (notifications: AppNotification[]) =>
      handlers.onNotificationsSync?.(notifications);
    const handleUnreadCount = (payload: { count: number }) =>
      handlers.onUnreadCount?.(payload.count);
    const handleProjectCreated = (payload: unknown) =>
      handlers.onProjectEvent?.("project:created", payload);
    const handleProjectAssigned = (payload: unknown) =>
      handlers.onProjectEvent?.("project:assigned", payload);

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("notification:new", handleNotificationNew);
    socket.on("notification:updated", handleNotificationUpdated);
    socket.on("notification:read", handleNotificationRead);
    socket.on("notification:read-all", handleNotificationsReadAll);
    socket.on("notification:deleted", handleNotificationDeleted);
    socket.on("notifications:sync", handleNotificationsSync);
    socket.on("notifications:unread_count", handleUnreadCount);
    socket.on("project:created", handleProjectCreated);
    socket.on("project:assigned", handleProjectAssigned);

    this.removeListeners = () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("notification:new", handleNotificationNew);
      socket.off("notification:updated", handleNotificationUpdated);
      socket.off("notification:read", handleNotificationRead);
      socket.off("notification:read-all", handleNotificationsReadAll);
      socket.off("notification:deleted", handleNotificationDeleted);
      socket.off("notifications:sync", handleNotificationsSync);
      socket.off("notifications:unread_count", handleUnreadCount);
      socket.off("project:created", handleProjectCreated);
      socket.off("project:assigned", handleProjectAssigned);
    };

    if (socket.connected) {
      handleConnect();
      return;
    }

    socket.connect();
  }

  markRead(id: string) {
    socket.emit("notification:mark_read", { id });
  }

  markAllRead() {
    socket.emit("notifications:mark_all_read");
  }

  getConnectionConfig() {
    return { url: SOCKET_URL, path: SOCKET_PATH };
  }

  detachListeners() {
    this.removeListeners?.();
    this.removeListeners = undefined;
  }

  disconnect() {
    this.detachListeners();
  }
}

export const notificationSocket = new NotificationSocket();
