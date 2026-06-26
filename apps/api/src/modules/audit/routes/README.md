# Audit Routes

This folder defines HTTP routes for the audit module.

## Files

### `audit.routes.ts`

Mounted by `app.ts` at:

```txt
/api/audit-logs
```

Route chain:

```txt
router.use(requireAuth)
GET / -> requirePermission(PERMISSIONS.AUDIT_LOGS_READ) -> getAuditLogs
```

When it runs:

- Route registration runs during `createApp()`.
- Middleware/controller execution runs only when a client requests `/api/audit-logs`.

Why it exists:

- Keeps audit-log endpoints isolated and protected.

