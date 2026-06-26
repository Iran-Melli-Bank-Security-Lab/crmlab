import type { Server, Socket } from "socket.io";
import type { NotificationPriority, NotificationType } from "@/constants/notifications";
import type { Permission } from "@/constants/permissions";
import type { ProjectType } from "@/constants/projects";
import type { Role } from "@/constants/roles";

export type AuthenticatedSocketUser = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  roles: Role[];
  permissions: Permission[];
  sessionVersion: number;
  projectIds?: string[];
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

export interface ServerToClientEvents {
  "socket:connected": (payload: {
    ok: true;
    socketId: string;
    userId: string;
    connectedAt: string;
  }) => void;
  "notification:new": (payload: NotificationPayload) => void;
  "notification:read": (payload: { id: string; isRead: true }) => void;
  "notification:read-all": (payload: { isRead: true }) => void;
  "project:created": (payload: ProjectEventPayload) => void;
  "project:assigned": (payload: ProjectEventPayload) => void;
}



export interface ClientToServerEvents {}
export interface InterServerEvents {}

export interface SocketData {
  user: AuthenticatedSocketUser;
}

export type AuthenticatedSocketData = {
  user: {
    id: string;
    username: string;
    roles: string[];
    sessionVersion: number;
  };
};


export type RealtimeSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  AuthenticatedSocketData
>;


export type RealtimeServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export type AuthedSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;
