# Audit Models

This folder defines MongoDB persistence for audit logs.

## Files

### `auditLog.model.ts`

Defines `AuditLogModel`.

When it runs:

- The schema is registered when this file is imported by the audit service or controller.
- Actual database writes happen later when `AuditLogModel.create(...)` is called.

Fields:

- `actorId`: user who performed the action, if known.
- `action`: stable audit action string.
- `entityType`: type of entity affected.
- `entityId`: id of affected entity.
- `ip`: request IP.
- `userAgent`: request user-agent.
- `metadata`: flexible extra data.
- timestamps: `createdAt`, `updatedAt`.

Why it exists:

- Provides searchable storage for security and administration events.

