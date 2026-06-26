// src/realtime/socket.types.ts

import { SOCKET_EVENTS } from "@/constants/socket";
import type { NotificationPriority, NotificationType } from "@/constants/notifications";
import type { ProjectType } from "@/constants/projects";
import type { Server, Socket } from "socket.io";

export type AuthSocketUser = {
   id: string;
   firstName?: string;
   lastName?: string;
   username?: string;
   sessionVersion?: number;
   roles: string[]; 
   projectIds?: string[];
};

export type SocketConnectedPayload = {
  ok: true;
  socketId: string;
  userId: string;
  roles: string[];
  connectedAt: string;
};

export type NotificationPayload = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  isRead: boolean;
  userId: string;
  projectId?: string;
  entityId?: string;
  actionUrl?: string;
  createdAt: Date;
};

export type ProjectEventPayload = {
  id: string;
  projectName: string;
  type?: ProjectType;
  createdAt: Date;
};

export type PingServerPayload = {
  message: string;
  sentAt?: string;
};

export type PongClientPayload = {
  ok: true;
  message: string;
  receivedAt: string;
};

export interface ServerToClientEvents {
  [SOCKET_EVENTS.CONNECTED]: (payload: SocketConnectedPayload) => void;
  [SOCKET_EVENTS.PONG_CLIENT]: (payload: PongClientPayload) => void;
  [SOCKET_EVENTS.NOTIFICATION_NEW]: (payload: NotificationPayload) => void;
  [SOCKET_EVENTS.NOTIFICATION_READ]: (payload: { id: string; isRead: true }) => void;
  [SOCKET_EVENTS.NOTIFICATION_UPDATED]: (payload: NotificationPayload) => void;
  [SOCKET_EVENTS.NOTIFICATION_DELETED]: (payload: { id: string }) => void;
  [SOCKET_EVENTS.NOTIFICATIONS_READ_ALL]: (payload: { isRead: true }) => void;
  [SOCKET_EVENTS.NOTIFICATIONS_SYNC]: (payload: NotificationPayload[]) => void;
  [SOCKET_EVENTS.NOTIFICATIONS_UNREAD_COUNT]: (payload: { count: number }) => void;
  [SOCKET_EVENTS.PROJECT_CREATED]: (payload: ProjectEventPayload) => void;
  [SOCKET_EVENTS.PROJECT_ASSIGNED]: (payload: ProjectEventPayload) => void;
}

export interface ClientToServerEvents {
  [SOCKET_EVENTS.PING_SERVER]: (payload: PingServerPayload) => void;
  "notifications:subscribe": (payload: { userId?: string; roles?: string[] }) => void;
  "notification:mark_read": (payload: { id: string }) => void;
  "notifications:mark_all_read": () => void;
}

export interface InterServerEvents {}

export interface SocketData {
  user?: AuthSocketUser;
}

export type RealtimeServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export type RealtimeSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;
