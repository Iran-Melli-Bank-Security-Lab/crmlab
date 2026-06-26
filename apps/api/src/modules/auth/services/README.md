# Auth Services

This folder contains authentication and session business logic.

## Files

### `auth.service.ts`

Exports:

- `registerUser`
- `loginUser`

When it runs:

- Called by auth controllers.

What it does:

- Checks duplicate email during registration.
- Hashes passwords with bcrypt.
- Finds users for login with `passwordHash` explicitly selected.
- Compares passwords with bcrypt.
- Converts user documents to auth JSON.
- Calls `issueSessionTokens`.

Why it exists:

- Keeps password and user-auth business rules outside HTTP controllers.

### `session.service.ts`

Exports:

- `issueSessionTokens`
- `getAuthUserFromAccessToken`
- `refreshAuthSession`
- `revokeRefreshSession`

When it runs:

- Login/register call `issueSessionTokens`.
- `requireAuth` calls `getAuthUserFromAccessToken`.
- Refresh endpoint calls `refreshAuthSession`.
- Logout calls `revokeRefreshSession`.

What it does:

- Hashes refresh tokens before storing them.
- Stores refresh sessions in MongoDB.
- Verifies access tokens and reloads live users.
- Checks `sessionVersion`.
- Rotates refresh tokens.
- Revokes old or reused refresh sessions.

Why it exists:

- Session security rules are complex and should live in one place.

