# Auth Controllers

This folder contains HTTP handlers for authentication.

## Files

### `auth.controller.ts`

Exports:

- `register`
- `login`
- `me`
- `refreshToken`
- `logout`

When it runs:

- These handlers run only when matching `/api/auth` routes are requested.

Handler behavior:

#### `register`

1. Calls `registerUser`.
2. Sets auth cookies.
3. Creates a CSRF token.
4. Writes an `auth.register` audit log.
5. Returns `{ user, csrfToken }`.

#### `login`

1. Calls `loginUser`.
2. Sets auth cookies.
3. Creates a CSRF token.
4. Writes an `auth.login` audit log.
5. Returns `{ user, csrfToken }`.

#### `me`

1. Requires `req.user`.
2. Reloads the user from MongoDB.
3. Returns safe auth JSON.

#### `refreshToken`

1. Reads refresh token cookie.
2. Calls `refreshAuthSession`.
3. Sets rotated auth cookies.
4. Creates a new CSRF token.
5. Writes an `auth.refresh` audit log.
6. Returns `{ user, csrfToken }`.

#### `logout`

1. Revokes the current refresh-token session.
2. Writes an `auth.logout` audit log.
3. Clears auth and CSRF cookies.
4. Returns a success message.

Why it exists:

- Controllers coordinate HTTP, cookies, CSRF, services, audit logs, and response formatting.

