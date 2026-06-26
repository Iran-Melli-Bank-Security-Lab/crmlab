# Step 18 — Enterprise Realtime Project Assignment Notifications

## Goal

When a project is created successfully and a security manager, quality manager, or DevOps manager is assigned to it, the assigned manager must:

1. See the project in the project list that matches their role/view.
2. Receive a persisted in-app notification.
3. Receive the notification in realtime through Socket.IO.
4. Receive a browser/OS notification when browser notification permission is granted.

The existing development-only `/auth/register-admin` route was not removed. The backend Socket.IO entry point remains `@/realtime/socket.server`.

---

## What changed

### 1. Backend realtime notification lifecycle

The backend now handles the notification realtime lifecycle more completely from `@/realtime/socket.server`:

- On authenticated socket connection, the socket joins:
  - `user:{userId}`
  - `role:{role}`
  - `project:{projectId}` for known user projects
- On socket connection, the backend sends:
  - `notifications:sync`
  - `notifications:unread_count`
- It listens for:
  - `notifications:subscribe`
  - `notification:mark_read`
  - `notifications:mark_all_read`

This means the realtime layer is no longer only a passive emitter. It can also synchronize notification state when a user connects or reconnects.

### 2. Project creation now creates initial manager assignments

When a project is created, the backend now creates initial `ProjectAssignment` records for accountable managers:

- `security_manager`
- `quality_manager`
- `devops_manager`

This makes project leadership more explicit and gives the project module a better enterprise assignment trail instead of relying only on direct fields like `projectManager`, `qualityManager`, and `devops`.

The legacy-compatible fields are still preserved.

### 3. Project visibility is preserved for assigned managers

The project list filter still supports role-specific views:

- Security manager sees security projects where they are `projectManager`.
- Quality manager sees quality projects where they are `qualityManager` or `projectManager`.
- DevOps manager sees projects where they are `devops`.
- Admin can see all projects when they have `admin.system.manage.all`.

The assigned managers are also added to `User.projectIds`, so their socket can join related project rooms on reconnect.

### 4. Persisted in-app notification

When a project is created, notifications are persisted in MongoDB using the existing `NotificationModel` and emitted with:

```txt
notification:new
```

Each assigned recipient receives their own notification in their private user room:

```txt
user:{recipientUserId}
```

The notification contains:

- `type: project.assigned`
- `title`
- `message`
- `priority: high`
- `projectId`
- `entityId`
- `actionUrl`

### 5. Unread count now updates in realtime

After creating a notification, the backend emits:

```txt
notifications:unread_count
```

So the notification badge can update without a manual refresh.

### 6. Frontend uses one enterprise socket instance

Before this step, the frontend had a shared socket client and a separate notification socket client. In Step 18, the notification realtime layer uses the shared socket singleton:

```txt
apps/web-fsa/src/shared/realtime/socket.client.ts
```

This avoids opening multiple Socket.IO connections for the same authenticated user.

### 7. Project list refreshes after realtime assignment

When the frontend receives:

- `notification:new` with `type: project.assigned`
- `project:created`
- `project:assigned`

it invalidates the RTK Query `Projects` tag. This allows project pages to refresh naturally after a manager receives an assignment event.

### 8. Browser / OS notifications

A browser notification service was added:

```txt
apps/web-fsa/src/features/notifications/browser/browserNotification.ts
```

When a realtime notification arrives, the frontend calls the Browser Notification API if:

- the browser supports notifications,
- the user has granted permission,
- and the notification is important enough.

`project.assigned` notifications always qualify for OS notification display.

A permission control was added to the notification center:

- `Enable OS alerts`
- `OS alerts on`
- `OS alerts blocked`
- `OS alerts unavailable`

Important limitation: browser/OS notifications require the user to grant permission. On most browsers, this works on `localhost` or HTTPS. This is not yet full Web Push for closed-browser delivery. Full closed-browser push would require Service Worker + Push Subscription + VAPID keys + backend push delivery.

---

## Validation

The following commands passed successfully:

```bash
npm run typecheck
npm run build
```

Build note: Vite may still warn about a large main chunk. This is a performance warning, not a build error. Code splitting can be improved in a future step.

---

## Recommended manual test

1. Run backend and frontend:

```bash
npm run dev
```

2. Login as a manager user in one browser.
3. Open the notification center and click `Enable OS alerts`.
4. Login as admin in another browser.
5. Create a project and assign the first user as security manager, quality manager, or DevOps manager.
6. Confirm that the assigned manager receives:
   - a notification in the notification center,
   - unread badge update,
   - OS/browser notification,
   - project list refresh in their role-specific project view.

---

## Next enterprise step

For Step 19, the best direction is full Web Push delivery:

- service worker registration,
- VAPID keys,
- push subscription model,
- backend web-push provider,
- delivery status tracking,
- retry/dead-letter queue.

That would allow notifications even when the application tab is closed, depending on browser and OS support.
