# Audit Module

The audit module records security-relevant actions and exposes recent audit logs to authorized admins.

## Runtime Flow

```txt
Controller in another module
  -> writeAuditLog(...)
  -> AuditLogModel.create(...)

GET /api/audit-logs
  -> requireAuth
  -> requirePermission(AUDIT_LOGS_READ)
  -> getAuditLogs
  -> AuditLogModel.find(...)
  -> sendSuccess(...)
```

## Subfolders

- `models`: MongoDB schema for audit log records.
- `services`: Safe audit log writer.
- `controllers`: HTTP handler for reading audit logs.
- `routes`: Protected audit-log API route.

## Why This Module Exists

Enterprise systems need traceability. This module answers questions such as:

- Who logged in?
- Who changed a user's roles?
- Who assigned users to a project?
- Who created a vulnerability?
- When did an upload happen?

