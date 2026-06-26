# Audit Services

This folder contains reusable audit business logic.

## Files

### `audit.service.ts`

Exports `writeAuditLog`.

When it runs:

- Called by controllers after important actions.

What it does:

1. Builds an audit log from explicit input and request metadata.
2. Uses `req.user?.id` as actor when no explicit `actorId` is provided.
3. Reads IP and user-agent from the request.
4. Writes to `AuditLogModel`.
5. Catches and logs audit failures instead of breaking the user request.

Why it exists:

- Audit logging should be easy to call from any module.
- A temporary audit-log write failure should not block normal user actions.

