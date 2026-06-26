# Projects Module

The projects module owns project listing, project creation, and assignment of users to projects.

## Runtime Flow

```txt
/api/projects
  -> requireAuth
  -> requirePermission(...)
  -> optional requireProjectAccess(...)
  -> optional validate(...)
  -> project controller
  -> ProjectModel/UserModel
  -> notifications/audit logs
  -> sendSuccess
```

## Subfolders

- `controllers`: Project request handlers.
- `models`: Project MongoDB schema.
- `routes`: Project route definitions.
- `validators`: Zod schemas for project inputs.
- `services`: Reserved for future reusable project business logic.

## Why This Module Exists

Projects are the main access boundary in the app. Many resources, such as vulnerabilities and notifications, are scoped to projects.

