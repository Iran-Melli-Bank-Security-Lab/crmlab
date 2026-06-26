# DevOps Routes

This folder defines `/api/devops` endpoints.

## Files

### `devops.routes.ts`

Mounted by `app.ts` at:

```txt
/api/devops
```

Route chain:

```txt
router.use(requireAuth)
GET  /deployments -> requirePermission(DEPLOYMENTS_READ) -> placeholder response
POST /deployments -> requirePermission(DEPLOYMENTS_CREATE) -> echo request body
GET  /servers     -> requirePermission(SERVERS_READ) -> placeholder response
```

When it runs:

- Route definitions register during startup.
- Placeholder handlers run when matching endpoints are called.

Why it exists:

- Provides a protected API skeleton for future DevOps work.

