# Utils Folder

This folder contains shared utilities used by many modules.

## Files

### `AppError.ts`

Defines the operational error class used throughout the backend.

When it runs:

- Services, controllers, or middleware instantiate `new AppError(...)`.

What it does:

- Stores an HTTP status code.
- Marks the error as operational.
- Defaults to internal server error.

Why it exists:

- `errorHandler` can safely expose known application errors while hiding unknown internal errors.

### `cookies.ts`

Centralizes cookie behavior.

When it runs:

- Auth controllers call it to set or clear cookies.
- Auth middleware calls it when refreshing tokens or clearing failed auth.
- CSRF middleware calls it for CSRF cookie handling.

What it does:

- Defines shared cookie options.
- Sets access/refresh auth cookies.
- Clears access/refresh auth cookies.
- Sets and clears CSRF secret cookie.

Why it exists:

- Cookie set/clear options must match, especially domain/path/sameSite/secure.

### `jwt.ts`

Centralizes JWT signing and verification.

When it runs:

- Session service signs and verifies tokens.

What it does:

- Defines access token payload.
- Defines refresh token payload with `tokenId`.
- Signs access tokens.
- Signs refresh tokens.
- Verifies both token types.

Why it exists:

- JWT details should not leak into controllers.

### `response.ts`

Centralizes success response shape.

When it runs:

- Controllers and placeholder route handlers call `sendSuccess` or `sendMessage`.

What it does:

- Sends `{ success: true, data }`.
- Sends `{ success: true, message }`.

Why it exists:

- Frontend code can rely on one API response shape.

