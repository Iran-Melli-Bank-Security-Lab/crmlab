# Modules Folder

This folder contains feature modules. Each module groups code by business capability: routes, controllers, services, models, validators, and related helpers.

## Execution Pattern

Most modules follow this request flow:

```txt
app.ts mounts module route
  -> module routes
  -> route-level middleware
  -> controller
  -> service/model
  -> response helper or error handler
```

## Module Folders

- `audit`: Audit log storage and admin audit-log reading.
- `auth`: Register, login, session, refresh-token rotation, logout, and current user.
- `devops`: DevOps placeholder routes with permission checks.
- `notifications`: Persistent and realtime notifications.
- `pentest`: Vulnerability read/create behavior.
- `projects`: Project creation, listing, and user assignment.
- `qa`: QA placeholder routes with permission checks.
- `tickets`: Ticket placeholder routes with permission checks.
- `uploads`: Avatar upload handling.
- `users`: User management and role/permission updates.

## Folder Conventions

- `routes`: Defines HTTP paths and middleware chain.
- `controllers`: Handles HTTP-specific coordination.
- `services`: Holds reusable business logic.
- `models`: Defines MongoDB/Mongoose schemas.
- `validators`: Defines Zod schemas used before controllers.

