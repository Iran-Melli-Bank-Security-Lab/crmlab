# Notification Type Contract

This document explains the notification data contract used by the application.

The source of truth for notification types is:

```txt
src/types/notification.ts
```

The goal is to make notifications more than a simple text message. A notification should carry enough context for routing, audit logs, realtime sync, multi-channel delivery, and future feature growth.

## Main Model

Every notification shown by the frontend uses `AppNotification`:

```ts
export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  isRead: boolean;
  createdAt: string;
  updatedAt?: string;
  expiresAt?: string;

  userId?: string;
  roleIds?: string[];
  channels?: NotificationChannel[];
  deliveryStatus?: NotificationDeliveryStatus;

  actor?: NotificationActor;
  entity?: NotificationEntity;
  projectId?: string;
  entityId?: string;

  actionUrl?: string;
  metadata?: Record<string, unknown>;
};
```

## Base Fields

### `id`

The unique identifier of the notification.

Used for:

- Updating an existing notification in Redux.
- Marking a notification as read.
- Deleting a notification.
- Deduplicating socket events.

Example:

```ts
id: "notif_01HZX7A9M8";
```

### `type`

The domain event that created the notification.

Examples:

```ts
type: "vulnerability.created";
type: "project.assigned";
type: "qa.result.submitted";
type: "system.announcement";
```

This field is important for both UI and backend behavior. For example, the frontend might route `vulnerability.created` to a vulnerability detail page, while `system.announcement` may only open a general announcement view.

### `title`

A short, user-facing title.

Example:

```ts
title: "New vulnerability submitted";
```

### `message`

The readable message shown to the user.

Example:

```ts
message: "A pentester submitted Stored XSS for Project X.";
```

### `priority`

The importance level of the notification.

Allowed values:

```ts
"low" | "medium" | "high" | "critical";
```

Used for:

- Badge color in the UI.
- Deciding whether to show an immediate toast.
- Backend delivery decisions such as email, SMS, or push.

Example:

```ts
priority: "high";
```

### `isRead`

Whether the current user has read the notification.

Example:

```ts
isRead: false;
```

The UI uses this for unread badges and unread item styling.

### `createdAt`

The notification creation time as an ISO string.

Example:

```ts
createdAt: "2026-06-01T10:00:00.000Z";
```

### `updatedAt`

The last update time of the notification. This field is optional.

Use it when:

- Delivery status changes from `queued` to `delivered`.
- Notification content changes.
- The backend updates the notification after initial creation.

Example:

```ts
updatedAt: "2026-06-01T10:05:00.000Z";
```

### `expiresAt`

The expiration time of the notification. This field is optional.

Useful for notifications that become irrelevant after a specific time, such as:

- Maintenance notices.
- Invitations.
- Deadline reminders.

Example:

```ts
expiresAt: "2026-06-05T23:59:59.000Z";
```

## Audience Targeting

### `userId`

The target user id when the notification is meant for one specific user.

Example:

```ts
userId: "user_123";
```

Scenario:

A project is assigned directly to one pentester.

```ts
{
  type: "project.assigned",
  userId: "pentester_123"
}
```

### `roleIds`

The target roles when the notification is meant for a role-based audience.

Example:

```ts
roleIds: ["security_project_manager"];
```

Scenario:

A pentester submits a new vulnerability and every security project manager should see it.

```ts
{
  type: "vulnerability.created",
  roleIds: ["security_project_manager"]
}
```

If both admins and security project managers should receive it:

```ts
roleIds: ["admin", "security_project_manager"];
```

Important:

`roleIds` does not replace backend permission checks. The backend must still verify that the receiving user is allowed to access the related entity.

## Delivery Channels

### `channels`

The delivery channels that should be used for the notification.

Allowed values:

```ts
"in_app" | "email" | "sms" | "push";
```

Examples:

In-app only:

```ts
channels: ["in_app"];
```

In-app and email:

```ts
channels: ["in_app", "email"];
```

Sensitive event:

```ts
channels: ["in_app", "email", "sms", "push"];
```

### `deliveryStatus`

The delivery state of the notification.

Allowed values:

```ts
"queued" | "delivered" | "read" | "failed";
```

Used for:

- Displaying delivery state.
- Backend retry logic.
- Audit logs for sensitive notifications.

Example:

```ts
deliveryStatus: "delivered";
```

## Event Source

### `actor`

The user or system actor that caused the notification.

Shape:

```ts
export type NotificationActor = {
  id: string;
  name: string;
  role?: string;
};
```

Example:

```ts
actor: {
  id: "user_456",
  name: "Ali Pentester",
  role: "pentester"
}
```

Scenario:

Ali Pentester submits a vulnerability. The security project manager should be able to see who created the event.

## Main Related Entity

### `entity`

The primary domain record that the notification is about.

Shape:

```ts
export type NotificationEntity = {
  id: string;
  type:
    | "project"
    | "vulnerability"
    | "deployment"
    | "ticket"
    | "qa_testcase"
    | "qa_result"
    | "user"
    | "system";
  label?: string;
};
```

Example:

```ts
entity: {
  id: "bug_789",
  type: "vulnerability",
  label: "Stored XSS"
}
```

Field meaning:

- `entity.id`: the id of the primary domain record.
- `entity.type`: the kind of record.
- `entity.label`: optional readable label for display.

### `entityId`

A simple shortcut for the primary entity id.

Example:

```ts
entityId: "bug_789";
```

Difference from `entity`:

`entityId` stores only the id. `entity` stores structured context.

Both exist in the current design so simple consumers can use `entityId`, while richer consumers can use `entity`. For new code, prefer filling `entity`, and keep `entityId` for compatibility or quick queries.

### `projectId`

The related project id when the notification belongs to a project context.

Example:

```ts
projectId: "project_x_123";
```

Scenario:

Vulnerability `bug_789` was submitted under project `project_x_123`.

```ts
projectId: "project_x_123",
entity: {
  id: "bug_789",
  type: "vulnerability",
  label: "Stored XSS"
}
```

Why keep `projectId` separate from `entity`?

Many entities are children of a project, such as:

- Vulnerabilities.
- QA results.
- Reports.
- Assignments.

Keeping `projectId` as a first-class field lets the backend and frontend quickly understand the project context without fetching the entity first.

## Action Routing

### `actionUrl`

The route the user should open when acting on the notification.

Example:

```ts
actionUrl: "/security-manager/projects/project_x_123/vulnerabilities/bug_789";
```

In the current UI, notifications with an `actionUrl` show an `Open` link.

Important:

`actionUrl` is for fast navigation. It should not be the only source of truth. For reliable processing, also send structured context like `projectId`, `entity`, and `metadata`.

## Extra Context

### `metadata`

Additional context that does not belong in the core notification fields.

Example:

```ts
metadata: {
  severity: "high",
  category: "xss",
  previousStatus: "draft",
  nextStatus: "submitted"
}
```

Recommended rule:

Do not use `metadata` for important fields that are always needed. If a field becomes part of the common contract, add it to the main type. Use `metadata` for extensions and scenario-specific context.

## Complete Example: Pentester Submits a Vulnerability

Scenario:

A pentester submits a vulnerability for Project X. The notification should go to security project managers, and clicking it should open the exact vulnerability.

```ts
const notification: AppNotification = {
  id: "notif_bug_001",
  type: "vulnerability.created",
  title: "New vulnerability submitted",
  message: "Ali Pentester submitted Stored XSS for Project X.",
  priority: "high",
  isRead: false,
  createdAt: "2026-06-01T10:00:00.000Z",

  roleIds: ["security_project_manager"],
  channels: ["in_app", "email"],
  deliveryStatus: "delivered",

  actor: {
    id: "user_pentester_123",
    name: "Ali Pentester",
    role: "pentester",
  },

  projectId: "project_x_123",
  entityId: "bug_789",
  entity: {
    id: "bug_789",
    type: "vulnerability",
    label: "Stored XSS",
  },

  actionUrl: "/security-manager/projects/project_x_123/vulnerabilities/bug_789",

  metadata: {
    severity: "high",
    category: "xss",
  },
};
```

## Complete Example: QA Result Submitted

```ts
const notification: AppNotification = {
  id: "notif_qa_001",
  type: "qa.result.submitted",
  title: "QA result submitted",
  message: "A QA member submitted regression test results for Project X.",
  priority: "medium",
  isRead: false,
  createdAt: "2026-06-01T11:30:00.000Z",

  roleIds: ["quality_project_manager"],
  channels: ["in_app"],
  deliveryStatus: "delivered",

  actor: {
    id: "user_qa_123",
    name: "Sara QA",
    role: "qa",
  },

  projectId: "project_x_123",
  entity: {
    id: "qa_result_456",
    type: "qa_result",
    label: "Regression Test Result",
  },

  actionUrl: "/quality-manager/projects/project_x_123/results/qa_result_456",
};
```

## Complete Example: System Announcement

```ts
const notification: AppNotification = {
  id: "notif_sys_001",
  type: "system.announcement",
  title: "Scheduled maintenance",
  message: "The platform will be unavailable tonight from 01:00 to 02:00.",
  priority: "low",
  isRead: false,
  createdAt: "2026-06-01T08:00:00.000Z",
  expiresAt: "2026-06-02T02:00:00.000Z",

  roleIds: [
    "admin",
    "security_project_manager",
    "quality_project_manager",
    "pentester",
    "qa",
  ],
  channels: ["in_app", "email"],
  deliveryStatus: "queued",

  entity: {
    id: "system",
    type: "system",
    label: "Platform",
  },
};
```

## Socket.IO Event Contract

The frontend listens for these events from the server:

```ts
{ event: "notification:new"; payload: AppNotification }
{ event: "notification:updated"; payload: AppNotification }
{ event: "notification:deleted"; payload: { id: string } }
{ event: "notifications:sync"; payload: AppNotification[] }
{ event: "notifications:unread_count"; payload: { count: number } }
```

Event meanings:

- `notification:new`: a new notification was created.
- `notification:updated`: an existing notification changed.
- `notification:deleted`: a notification was deleted.
- `notifications:sync`: the server sends a full or partial notification list for synchronization.
- `notifications:unread_count`: the server sends only the unread count.

The frontend emits these events to the server:

```txt
notifications:subscribe
notification:mark_read
notifications:mark_all_read
```

The REST API and Socket.IO server use the same origin by default. Override this only
when the socket server is hosted separately:

```env
VITE_API_BASE_URL=http://localhost:4000/api
VITE_SOCKET_URL=http://localhost:4000
VITE_SOCKET_PATH=/socket.io
```

For assignment notifications, the backend must join each authenticated socket to
`user:{authenticatedUserId}` and emit `notification:new` to both the selected
`projectManagerId` and `devopsManagerId` rooms after the project transaction succeeds.

## Backend Recommendations

1. For user-specific notifications, set `userId`.
2. For role-based notifications, set `roleIds`.
3. For project-related events, always set `projectId`.
4. For events about a specific domain record, always set `entity`.
5. If the user should be able to open a page from the notification, set `actionUrl`.
6. For security-sensitive notifications, enforce permissions on the backend again.
7. Use `metadata` only for extra context, not for core permanent fields.
8. For cookie-based auth, Socket.IO should use `withCredentials` and HttpOnly cookies.

## Frontend Recommendations

1. Use `actionUrl` for navigation.
2. Use `entity.label`, `actor.name`, and `projectId` for display context.
3. Use `priority` for urgency and visual treatment.
4. Use `isRead` and unread counts for notification badges.
5. If the notification structure changes, update both `src/types/notification.ts` and this document.
