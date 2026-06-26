# User Controllers

This folder contains HTTP handlers for user management.

## Files

### `user.controller.ts`

Exports:

- `getUsers`
- `createUser`
- `updateUserRolesPermissions`

When it runs:

- Runs after `requireAuth` and the required user-management permission.

Handler details:

#### `getUsers`

- Reads users sorted newest first.
- Converts each user with `toAuthUserContext`.
- Returns safe user data.

#### `createUser`

- Hashes password with bcrypt.
- Creates a new user.
- Writes `user.create` audit log.
- Returns safe user data with HTTP 201.

#### `updateUserRolesPermissions`

- Updates `UserModel.roles` and `UserPermissionModel.permissions`.
- Increments `sessionVersion`.
- Incrementing `sessionVersion` invalidates old access/refresh tokens.
- Writes `user.roles_update` audit log.
- Returns updated safe user data.

Why it exists:

- User management is an admin-level feature and needs auditability.
