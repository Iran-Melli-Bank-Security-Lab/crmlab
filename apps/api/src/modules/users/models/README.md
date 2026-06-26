# User Models

This folder defines user persistence, role persistence, and per-user permission persistence.

## Files

### `user.model.ts`

Defines `UserModel`.

When it runs:

- Schema is registered when imported by auth, users, session, seed, or project logic.

Fields:

- `firstName`
- `lastName`
- `username`
- `password`
- `avatarUrl`
- `roles`
- `projectIds`
- `sessionVersion`
- `isActive`

Important behavior:

- `passwordHash` uses `select: false`, so it is not returned unless explicitly selected.
- `roles` default to pentester.
- `sessionVersion` is included in auth context so tokens can be invalidated after role changes.

### `role.model.ts`

Defines `RoleModel`.

Role permissions are stored here in the `permissions` field. These are the baseline permissions for each role.

### `userPermission.model.ts`

Defines `UserPermissionModel`.

Effective per-user permissions are stored here:

- `userId`
- `permissions`

`permissions` is initialized from the user's roles during registration or user creation. If a user has multiple roles, role permissions are merged before being written.

Why it exists:

- This is the central identity model of the backend.
