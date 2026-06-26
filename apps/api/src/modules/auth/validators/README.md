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

- Login requires username and password with minimum length.
- Register accepts first name, last name, username, password, optional avatar URL, and optional roles.

Why it exists:

- Auth controllers should only receive valid request bodies.
