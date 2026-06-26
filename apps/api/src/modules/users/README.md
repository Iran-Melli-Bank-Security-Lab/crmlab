# Users Module

The users module owns admin user management: listing users, creating users, and updating roles/permissions.

## Runtime Flow

```txt
/api/users
  -> requireAuth
  -> requirePermission(...)
  -> user controller
  -> UserModel
  -> UserPermissionModel
  -> optional audit log
  -> sendSuccess
```

## Subfolders

- `controllers`: User management request handlers.
- `models`: User, role, and per-user permission MongoDB schemas.
- `routes`: Protected user management routes.
- `services`: Reserved for future reusable user logic.
- `validators`: Reserved for future user validation schemas.

## Why This Module Exists

Users are the root of authentication, authorization, project assignment, and session invalidation.
