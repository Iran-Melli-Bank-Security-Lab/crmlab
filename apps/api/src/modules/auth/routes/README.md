# Auth Routes

This folder defines `/api/auth` endpoints.

## Files

### `auth.routes.ts`

Mounted by `app.ts` at:

```txt
/api/auth
```

Routes:

```txt
POST /register       -> validate(registerSchema) -> register
POST /login          -> validate(loginSchema) -> login
GET  /csrf-token     -> csrfTokenHandler
GET  /me             -> requireAuth -> me
POST /refresh-token  -> refreshToken
POST /logout         -> logout
```

When it runs:

- Route definitions are registered during startup.
- Middleware and controllers run per request.

Important detail:

- `refresh-token` intentionally calls a dedicated controller instead of `requireAuth`, because it must rotate the refresh token even if the access token is still valid.

