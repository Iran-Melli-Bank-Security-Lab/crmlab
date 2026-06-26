# Notification Services

This folder contains notification business logic.

## Files

### `notification.service.ts`

Exports `createNotification`, `createNotifications`, and `serializeNotification`.

When it runs:

- Called by project assignment and vulnerability creation logic.

What it does:

1. Creates a notification document.
2. Builds a payload for API/realtime use.
3. Emits `notification:new` to the target user room.
4. Returns the payload.

Why it exists:

- Persistent storage and realtime delivery should stay synchronized.
- Private user payloads must not be exposed through shared project rooms.
