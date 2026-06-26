# Constants Folder

This folder contains type-safe values used across the backend. These files run at import time and do not perform side effects. Their main job is to prevent hardcoded string mistakes in routes, permissions, events, cookies, statuses, and domain values.

## Files

### `audit.ts`

Defines audit action names and audit entity types.

Used by:

- audit service
- auth controller
- users controller
- projects controller
- pentest controller
- notifications controller
- uploads controller

Why it exists:

- Audit logs must use stable action names. A typo in an audit action makes logs harder to query later.

### `http.ts`

Defines HTTP status codes and HTTP method constants.

Used by:

- controllers
- middleware
- response helper
- CSRF middleware

Why it exists:

- `HTTP_STATUS.UNAUTHORIZED` is clearer and safer than raw `401`.

### `cors.ts`

Defines default development CORS origins.

Used by:

- env configuration
- Express CORS through `env.clientUrls`
- Socket.IO CORS through `env.clientUrls`

Why it exists:

- Frontend origins should be added in one constant file instead of searching through app setup code.

### `notifications.ts`

Defines notification types and notification priorities.

Used by:

- notification model
- notification service
- project controller
- pentest controller

Why it exists:

- Notification records and realtime events should use consistent type names and priority values.

### `permissions.ts`

Defines all permission constants.

Used by:

- route-level `requirePermission`
- role-permission mapping
- frontend dashboard access decisions through `/api/auth/me`

Why it exists:

- Permissions are the main authorization contract of the application.

### `projects.ts`

Defines project types and statuses.

Used by:

- project model
- project validators

Why it exists:

- Mongoose enum values and Zod validator enum values must stay aligned.

### `rolePermissions.ts`

Maps default roles to permissions and exports `getPermissionsFromRoles()`.

Used by:

- role seeding and fallback role-permission resolution

When it runs:

- It is loaded by role services when default role permissions are needed.

Why it exists:

- Roles are high-level labels; permissions are what route guards actually check.

### `roles.ts`

Defines role constants and the `Role` union type.

Used by:

- user model
- seed script
- project access middleware
- role-permission mapping

Why it exists:

- Role names should never be typed manually across the app.

### `routes.ts`

Defines backend route paths, API endpoint paths, and frontend action URL builders.

Used by:

- `app.ts`
- route files
- CSRF middleware
- notification action URLs

Why it exists:

- Route strings are shared between app mounting, routers, CSRF exclusions, and docs.

### `security.ts`

Defines cookie names, CSRF header names, and security-related body field names.

Used by:

- cookie utility
- auth middleware
- CSRF middleware
- Socket.IO auth

Why it exists:

- Cookie and header name typos can break authentication or CSRF protection.

### `socket.ts`

Defines Socket.IO event names and room builders.

Used by:

- realtime socket server
- notification service

Why it exists:

- Room names must match between `socket.join(...)` and `io.to(...).emit(...)`.

### `uploads.ts`

Defines upload field names, limits, MIME-prefix checks, and public path builders.

Used by:

- upload route
- upload controller

Why it exists:

- Upload constraints and public path generation should be consistent.

### `vulnerabilities.ts`

Defines vulnerability severity and status values.

Used by:

- vulnerability model
- pentest controller

Why it exists:

- Vulnerability severity/status values are part of the domain model and should be type-safe.
