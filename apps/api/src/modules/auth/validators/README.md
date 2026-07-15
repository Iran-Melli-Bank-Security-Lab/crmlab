# Auth Validators

This folder contains Zod schemas for auth request validation.

## Files

### `auth.validators.ts`

Exports:

- `loginSchema`
- `registerSchema`

When it runs:

- Imported by `auth.routes.ts`.
- Used by `validate(...)` middleware before auth controllers.

Validation rules:

- Login requires a valid username and a non-empty password. Password-strength
  rules apply only when creating accounts, so existing short passwords can authenticate.
- Register accepts first name, last name, username, password, optional avatar URL, and optional roles.

Why it exists:

- Auth controllers should only receive valid request bodies.
