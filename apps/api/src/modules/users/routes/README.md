# User Routes

This folder defines `/api/users` endpoints.

## Files

### `user.routes.ts`

Mounted by `app.ts` at:

```txt
/api/users
```

Route chain:

```txt
router.use(requireAuth)
GET   /                      -> requirePermission(USERS_READ) -> getUsers
POST  /                      -> requirePermission(USERS_CREATE) -> createUser
PUT   /:userId               -> requirePermission(USERS_UPDATE) -> updateUserRolesPermissions
PATCH /:id/roles-permissions -> requirePermission(USERS_UPDATE) -> updateUserRolesPermissions
```

`PUT /api/users/:userId` is the frontend user-management endpoint for updating a user's roles and effective permissions.

When it runs:

- Routes are registered during startup.
- Controller logic runs only for matching requests.

Why it exists:

- Protects all user-management operations with authentication and permissions.
