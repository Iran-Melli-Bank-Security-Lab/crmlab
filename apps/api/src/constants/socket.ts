export const SOCKET_EVENTS = {
  CONNECTED: "socket:connected",
  PING_SERVER: "ping:server",
  PONG_CLIENT: "pong:client",
  NOTIFICATION_NEW: "notification:new",
  NOTIFICATION_READ: "notification:read",
  NOTIFICATION_UPDATED: "notification:updated",
  NOTIFICATION_DELETED: "notification:deleted",
  NOTIFICATIONS_READ_ALL: "notification:read-all",
  NOTIFICATIONS_SYNC: "notifications:sync",
  NOTIFICATIONS_UNREAD_COUNT: "notifications:unread_count",
  PROJECT_CREATED: "project:created",
  PROJECT_ASSIGNED: "project:assigned",

} as const;

export const SOCKET_ROOMS = {
  USER: (userId: string) => `user:${userId}`,
  ROLE: (role: string) => `role:${role}`,
  PROJECT: (projectId: string) => `project:${projectId}`,
} as const;

export type SocketEvent = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];
