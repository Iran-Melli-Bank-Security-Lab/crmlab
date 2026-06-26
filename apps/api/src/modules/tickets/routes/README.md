# Ticket Routes

This folder defines `/api/tickets` endpoints.

## Files

### `ticket.routes.ts`

Mounted by `app.ts` at:

```txt
/api/tickets
```

Route chain:

```txt
router.use(requireAuth)
GET   /           -> requirePermission(TICKETS_READ) -> placeholder response
POST  /           -> requirePermission(TICKETS_CREATE) -> echo request body
PATCH /:id/status -> requirePermission(TICKETS_UPDATE) -> echo status update
```

When it runs:

- Route definitions register during startup.
- Placeholder handlers run when matching endpoints are called.

Why it exists:

- Provides a protected API skeleton for future ticket workflows.

