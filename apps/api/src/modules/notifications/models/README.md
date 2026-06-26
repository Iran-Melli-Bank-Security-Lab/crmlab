# Notification Models

This folder defines notification persistence.

## Files

### `notification.model.ts`

Defines `NotificationModel`.

When it runs:

- Schema is registered when imported by notification service or controller.

Fields:

- `userId`: recipient user.
- `projectId`: optional project context.
- `type`: notification event type.
- `title`: display title.
- `message`: display message.
- `priority`: low, medium, high, or critical.
- `isRead`: read state.
- `actionUrl`: optional frontend URL.
- `entityId`: optional related entity id.

Why it exists:

- Notifications must persist even if the user is offline.

