# Notification Controllers

This folder contains HTTP handlers for user notifications.

## Files

### `notification.controller.ts`

Exports:

- `getNotifications`
- `markAsRead`
- `markAllAsRead`

When it runs:

- Runs after `requireAuth` in notification routes.

Handler details:

#### `getNotifications`

- Reads latest 50 notifications for `req.user.id`.
- Maps Mongo documents to API-safe objects.
- Returns the list through `sendSuccess`.

#### `markAsRead`

- Marks one notification as read.
- Scopes update by both notification id and current user id.
- Writes audit log.
- Returns the updated read state.

#### `markAllAsRead`

- Marks all unread notifications for current user as read.
- Writes audit log.
- Returns read state summary.

Why it exists:

- Notification read state belongs to the current authenticated user.

