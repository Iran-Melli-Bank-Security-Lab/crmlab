# Auth Module

The auth module owns registration, login, current user lookup, refresh-token rotation, logout, auth sessions, and auth validation.

## Runtime Flow

```txt
/api/auth route
  -> optional validate(...)
  -> controller
  -> auth/session service
  -> UserModel/AuthSessionModel
  -> cookies + CSRF token
  -> audit log
  -> response helper
```

## Subfolders

- `controllers`: HTTP handlers for auth endpoints.
- `models`: Refresh-token session storage.
- `routes`: Auth route definitions.
- `services`: Auth business logic and session/token logic.
- `validators`: Zod schemas for login/register.

## Why This Module Exists

Authentication has several coordinated responsibilities:

- Password hashing and comparison.
- User lookup.
- JWT creation and verification.
- Refresh-token rotation.
- Cookie management.
- CSRF token creation.
- Audit logging.

Keeping these in one module makes the auth flow easier to reason about.

