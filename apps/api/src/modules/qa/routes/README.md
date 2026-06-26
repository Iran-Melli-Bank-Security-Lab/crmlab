# QA Routes

This folder defines `/api/qa` endpoints.

## Files

### `qa.routes.ts`

Mounted by `app.ts` at:

```txt
/api/qa
```

Route chain:

```txt
router.use(requireAuth)
GET   /test-cases            -> requirePermission(QA_TEST_CASES_READ) -> placeholder response
POST  /test-cases            -> requirePermission(QA_TEST_CASES_CREATE) -> echo request body
PATCH /test-cases/:id/status -> requirePermission(QA_TEST_CASES_UPDATE) -> echo status update
```

When it runs:

- Route definitions register during startup.
- Placeholder handlers run when matching endpoints are called.

Why it exists:

- Provides a protected API skeleton for future QA features.

