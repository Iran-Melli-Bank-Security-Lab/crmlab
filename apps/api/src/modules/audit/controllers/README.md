# Audit Controllers

Controllers in this folder receive HTTP requests for audit-log APIs.

## Files

### `audit.controller.ts`

Exports `getAuditLogs`.

When it runs:

- Runs on `GET /api/audit-logs`.
- The route already requires authentication and `PERMISSIONS.AUDIT_LOGS_READ`.

What it does:

1. Reads the latest 200 audit logs from MongoDB.
2. Sorts newest first.
3. Maps Mongo documents into API-safe objects.
4. Returns the result through `sendSuccess`.

Why it exists:

- Admins need an API to inspect audit history.

