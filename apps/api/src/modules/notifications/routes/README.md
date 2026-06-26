# Notification Routes

This folder defines `/api/notifications` endpoints.

## Files

### `notification.routes.ts`

Mounted by `app.ts` at:

```txt
/api/notifications
```

Route chain:

```txt
router.use(requireAuth)
GET   /         -> getNotifications
PATCH /read-all -> markAllAsRead
PATCH /:id/read -> markAsRead
```

When it runs:

- Route definitions register during app startup.
- Controller handlers execute per matching request.

Why it exists:

- All notification endpoints are user-specific and require authentication.

