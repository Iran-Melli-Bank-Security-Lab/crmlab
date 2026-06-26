# Auth Models

This folder stores auth-related MongoDB schemas.

## Files

### `authSession.model.ts`

Defines `AuthSessionModel`.

When it runs:

- The schema is registered when imported by `session.service.ts`.
- Documents are created during login/register/refresh.

Fields:

- `userId`: owner of the refresh session.
- `tokenId`: unique id embedded inside the refresh JWT.
- `refreshTokenHash`: SHA-256 hash of the refresh token.
- `sessionVersion`: user session version at token issue time.
- `userAgent`: request user-agent.
- `ip`: request IP.
- `expiresAt`: refresh token expiry.
- `revokedAt`: when session was revoked.
- `replacedByTokenId`: next token id after rotation.

Why it exists:

- Refresh tokens must be revocable, rotatable, and traceable.

