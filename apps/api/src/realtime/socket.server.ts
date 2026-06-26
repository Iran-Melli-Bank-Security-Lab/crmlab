// src/realtime/socket.server.ts

import { createAdapter } from "@socket.io/redis-adapter";
import { Server as SocketIOServer } from "socket.io";
import type { Server as HttpServer } from "http";

import { SOCKET_EVENTS } from "@/constants/socket";
import {
  NOTIFICATION_PRIORITIES,
  type NotificationPriority,
  type NotificationType,
} from "@/constants/notifications";
import { NotificationModel } from "@/modules/notifications/models/notification.model";
import { socketAuthMiddleware } from "./socket.auth";
import { socketConfig, isAllowedSocketOrigin } from "./socket.config";
import { createSocketRedisClients, type SocketRedisClients } from "./socket.redis";
import { getInitialRooms } from "./socket.rooms";
import type {
  ClientToServerEvents,
  InterServerEvents,
  RealtimeServer,
  RealtimeSocket,
  ServerToClientEvents,
  SocketData,
} from "./socket.types";

let ioInstance: RealtimeServer | null = null;
let redisClients: SocketRedisClients | null = null;

function toNotificationSocketPayload(notification: {
  _id: { toString(): string };
  type: string;
  title: string;
  message: string;
  priority?: string;
  isRead?: boolean;
  userId: unknown;
  projectId?: unknown;
  entityId?: string | null;
  actionUrl?: string | null;
  createdAt?: Date;
}) {
  return {
    id: notification._id.toString(),
    type: notification.type as NotificationType,
    title: notification.title,
    message: notification.message,
    priority: (notification.priority || NOTIFICATION_PRIORITIES.MEDIUM) as NotificationPriority,
    isRead: Boolean(notification.isRead),
    userId: String(notification.userId),
    projectId: notification.projectId ? String(notification.projectId) : undefined,
    entityId: notification.entityId || undefined,
    actionUrl: notification.actionUrl || undefined,
    createdAt: notification.createdAt || new Date(),
  };
}

async function syncSocketNotifications(socket: RealtimeSocket) {
  const userId = socket.data.user?.id;
  if (!userId) return;

  const [notifications, unreadCount] = await Promise.all([
    NotificationModel.find({ userId }).sort({ createdAt: -1 }).limit(50),
    NotificationModel.countDocuments({ userId, isRead: false }),
  ]);

  socket.emit(
    SOCKET_EVENTS.NOTIFICATIONS_SYNC,
    notifications.map(toNotificationSocketPayload)
  );
  socket.emit(SOCKET_EVENTS.NOTIFICATIONS_UNREAD_COUNT, { count: unreadCount });
}

export async function setupSocket(server: HttpServer): Promise<RealtimeServer> {
  if (ioInstance) return ioInstance;

  const io: RealtimeServer = new SocketIOServer<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(server, {
    path: socketConfig.path,
    cors: {
      ...socketConfig.cors,
      methods: [...socketConfig.cors.methods],
    },
    allowRequest: (request, callback) => {
      callback(null, isAllowedSocketOrigin(request.headers.origin));
    },
    connectionStateRecovery: socketConfig.connectionStateRecovery,
    pingInterval: socketConfig.pingInterval,
    pingTimeout: socketConfig.pingTimeout,
    maxHttpBufferSize: socketConfig.maxHttpBufferSize,
    transports: [...socketConfig.transports],
  });

  if (socketConfig.redisUrl) {
    redisClients = await createSocketRedisClients({ redisUrl: socketConfig.redisUrl });
    io.adapter(createAdapter(redisClients.pubClient, redisClients.subClient));
  }

  io.use(socketAuthMiddleware);

  io.on("connection", async (socket) => {
    const user = socket.data.user;

    if (!user) {
      socket.disconnect(true);
      return;
    }

    await socket.join(getInitialRooms(user));

    socket.emit(SOCKET_EVENTS.CONNECTED, {
      ok: true,
      socketId: socket.id,
      userId: user.id,
      roles: user.roles,
      connectedAt: new Date().toISOString(),
    });

    await syncSocketNotifications(socket);

    socket.on(SOCKET_EVENTS.PING_SERVER, () => {
      socket.emit(SOCKET_EVENTS.PONG_CLIENT, {
        ok: true,
        message: "pong from authenticated socket",
        receivedAt: new Date().toISOString(),
      });
    });

    socket.on("notifications:subscribe", async () => {
      try {
        await syncSocketNotifications(socket);
      } catch (error) {
        console.warn("[socket:notifications:subscribe] failed", error);
      }
    });

    socket.on("notification:mark_read", async ({ id }) => {
      try {
        const notification = await NotificationModel.findOneAndUpdate(
          { _id: id, userId: user.id },
          { isRead: true },
          { new: true }
        );
        if (!notification) return;

        socket.emit(SOCKET_EVENTS.NOTIFICATION_READ, { id, isRead: true });
        const unreadCount = await NotificationModel.countDocuments({
          userId: user.id,
          isRead: false,
        });
        socket.emit(SOCKET_EVENTS.NOTIFICATIONS_UNREAD_COUNT, { count: unreadCount });
      } catch (error) {
        console.warn("[socket:notification:mark_read] failed", error);
      }
    });

    socket.on("notifications:mark_all_read", async () => {
      try {
        await NotificationModel.updateMany(
          { userId: user.id, isRead: false },
          { isRead: true }
        );
        socket.emit(SOCKET_EVENTS.NOTIFICATIONS_READ_ALL, { isRead: true });
        socket.emit(SOCKET_EVENTS.NOTIFICATIONS_UNREAD_COUNT, { count: 0 });
      } catch (error) {
        console.warn("[socket:notifications:mark_all_read] failed", error);
      }
    });
  });

  io.engine.on("connection_error", (error) => {
    if (process.env.NODE_ENV !== "test") {
      console.warn("[Socket.IO connection error]", error.code, error.message);
    }
  });

  ioInstance = io;
  console.info("[socket] initialized via @/realtime/socket.server");
  return io;
}

export function getIO(): RealtimeServer {
  if (!ioInstance) {
    throw new Error("Socket.IO is not initialized");
  }

  return ioInstance;
}

export function getIOIfInitialized(): RealtimeServer | null {
  return ioInstance;
}

export async function closeSocket(): Promise<void> {
  const io = ioInstance;
  ioInstance = null;

  if (io) {
    await new Promise<void>((resolve) => io.close(() => resolve()));
  }

  if (redisClients) {
    await redisClients.close();
    redisClients = null;
  }
}
