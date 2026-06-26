# Middlewares Folder

This folder contains reusable Express middleware. Middleware runs between the global Express app and controllers. It can authenticate, authorize, validate, reject, enrich, or format requests.

## Files

### `auth.middleware.ts`

Exports `requireAuth`.

When it runs:

- Any route or router that attaches `requireAuth`.
- Many modules call `router.use(requireAuth)` so all routes in that module require authentication.

What it does:

1. Reads the `accessToken` cookie.
2. If present, verifies it and reloads the live user from MongoDB.
3. If no access token exists, reads the `refreshToken` cookie.
4. Rotates the refresh token through `refreshAuthSession()`.
5. Sets new auth cookies when refresh succeeds.
6. Attaches the live user to `req.user`.
7. Clears auth cookies and returns unauthorized on failure.

Why it exists:

- Controllers should not manually parse cookies or verify JWTs.

### `csrf.middleware.ts`

Exports `csrfProtection`, `csrfTokenHandler`, and `createCsrfToken`.

When it runs:

- `csrfProtection` runs globally in `app.ts`.
- `csrfTokenHandler` runs on `GET /api/auth/csrf-token`.
- `createCsrfToken` is called after login/register/refresh.

What it does:

- Skips safe methods: GET, HEAD, OPTIONS.
- Skips public login/register.
- Requires a valid CSRF token for unsafe cookie-auth requests.
- Stores the CSRF secret in an httpOnly cookie.
- Sends the signed CSRF token to the client.

Why it exists:

- Cookie-auth APIs need CSRF protection because browsers automatically send cookies.

### `error.middleware.ts`

Exports `notFoundHandler` and `errorHandler`.

When it runs:

- Mounted last in `app.ts`.
- `notFoundHandler` runs when no route matched.
- `errorHandler` runs when any middleware/controller calls `next(error)` or throws.

What it does:

- Converts not-found requests to 404.
- Formats errors as `{ success: false, error: { message, statusCode } }`.
- Hides unknown internal errors.

Why it exists:

- API errors need a predictable shape.

### `permission.middleware.ts`

Exports `requirePermission(...permissions)`.

When it runs:

- Route files call it after `requireAuth`.

What it does:

- Reads `req.user.permissions`.
- Ensures all required permissions exist.
- Returns 403 if permission is missing.

Why it exists:

- Auth identifies the user; permission middleware decides what the user can do.

### `projectAccess.middleware.ts`

Exports `requireProjectAccess`, `canAccessProject`, and `getAccessibleProjectIds`.

When it runs:

- Routes with project-owned resources call `requireProjectAccess`.
- Controllers can use `getAccessibleProjectIds` for list filtering.

What it does:

- Loads a project by id from params or body.
- Allows admin, project owner, or assigned user.
- Attaches the project to `req.project`.

Why it exists:

- Users with general permission still must be scoped to their own projects.

### `validate.middleware.ts`

Exports `validate(schema)`.

When it runs:

- Route files call it before controllers.

What it does:

- Validates `body`, `params`, and `query` with Zod.
- Forwards a 400 error if invalid.
- Calls `next()` when valid.

Why it exists:

- Controllers should receive valid request data.
