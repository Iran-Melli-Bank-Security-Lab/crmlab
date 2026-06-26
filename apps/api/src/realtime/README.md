# Realtime

Socket.IO provides authenticated, user-specific notifications and project events.

## Authentication

Clients connect with credentials enabled. The server reads the same `accessToken`
HTTP-only cookie used by the REST API, validates the session version, and rejects
inactive or expired sessions.

```ts
const socket = io(API_URL, {
  withCredentials: true,
  transports: ["websocket", "polling"],
});
```

## Rooms

- `user:{userId}`: private events for all browser tabs/devices of one user.
- `role:{role}`: reusable role-level broadcasts.
- `project:{projectId}`: non-private project domain events.

Room names and membership are owned by `socket.rooms.ts`. Business modules should
use `socket.delivery.ts` instead of constructing room names directly.

When users are assigned while connected, all of their active sockets are joined
to the project room immediately. Their persisted `projectIds` restore membership
after reconnecting.

## Server Events

- `socket:connected`: authenticated connection metadata.
- `notification:new`: a private persisted notification.
- `notification:read`: one notification was read in another tab/device.
- `notification:read-all`: all notifications were read.
- `project:created`: a project visible to room members was created.
- `project:assigned`: project membership changed.

Private notification payloads are emitted only to user rooms. Project rooms never
receive another user's notification document.

## Horizontal Scaling

Set `SOCKET_REDIS_URL` (or `REDIS_URL`) to enable the Socket.IO Redis adapter.
Without it, the server uses the in-memory adapter for local development and a
single application instance.
