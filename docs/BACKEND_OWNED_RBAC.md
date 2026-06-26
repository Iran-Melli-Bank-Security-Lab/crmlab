# Backend-Owned RBAC

This project now treats backend permissions as the only runtime source of truth
for frontend access.

## What This Means

```txt
Roles are admin/domain data.
Permissions are runtime access data.
```

The backend stores roles, permissions, and role-permission assignments in the
database. When the frontend authenticates a user or loads user data, it receives
the user's effective `permissions`. Frontend guards and navigation checks use
only that permission list.

## Runtime Flow

```txt
MongoDB role + permission data
  -> backend auth/user services calculate effective permissions
  -> API response includes user.permissions
  -> frontend stores user.permissions
  -> route guard, sidebar, dashboard redirect check permissions only
```

## Frontend Files That Enforce This

```txt
apps/web-fsa/src/entities/permission/domain/accessPolicy.ts
apps/web-fsa/src/entities/permission/domain/accessRules.ts
apps/web-fsa/src/entities/permission/application/routeAccess.ts
apps/web-fsa/src/entities/permission/application/sidebarAccess.ts
apps/web-fsa/src/entities/permission/application/dashboardAccess.ts
apps/web-fsa/src/app/router/guards/PermissionRoute.tsx
```

## What Changed

Route policies no longer include `roles`.

Sidebar visibility no longer checks `roles`.

Dashboard redirects after login/signup no longer check `roles`.

The old `RoleRoute` guard was removed.

The Projects page chooses its workspace view from permissions and the
`workspace` query parameter, not from user roles.

The Create Project page lists eligible users by their permissions, not by their
roles.

## Where Roles Still Exist

Roles still exist where they are domain data:

```txt
User profile and navbar display
Admin role/permission management
Backend role catalog
Notification audience metadata
Database RBAC records
```

This is intentional. The rule is not "delete roles"; the rule is "do not use
roles as frontend access gates."

## Adding A New Permission

1. Add the permission to the shared/backend permission registry.
2. Store or assign it from the backend role/permission system.
3. Return it in the user's effective `permissions`.
4. Reference that permission in the relevant frontend policy only if a frontend
   screen or navigation item needs it.

No frontend route, sidebar, or dashboard code should be changed to check a role.
