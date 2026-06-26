# Centralized Business Rules

This project uses Feature-Sliced Architecture with lightweight Clean Architecture
ideas for business rules.

The goal is simple:

```txt
When a business rule changes, change one policy/use-case area instead of hunting
through pages, widgets, routes, and components.
```

## Step 1: Backend-Owned RBAC And Navigation Policies

The first centralized domain is RBAC/navigation access.

Important rule:

```txt
The backend is the source of truth for permissions.
The frontend does not decide access from roles.
The frontend only consumes the effective permissions returned by the backend.
```

Main files:

```txt
apps/web-fsa/src/entities/permission/domain/accessPolicy.ts
apps/web-fsa/src/entities/permission/domain/accessRules.ts
apps/web-fsa/src/entities/permission/application/dashboardAccess.ts
apps/web-fsa/src/entities/permission/application/routeAccess.ts
apps/web-fsa/src/entities/permission/application/sidebarAccess.ts
apps/web-fsa/src/entities/permission/application/rolePermissions.ts
```

`rolePermissions.ts` is only for admin UI workflows that preview or auto-fill
permissions from the backend role catalog. It is not used by route guards,
dashboard redirects, or sidebar visibility.

## Dependency Direction

UI and framework code should ask the domain/application layer for decisions.

```txt
pages/widgets/features -> entities/permission/application -> entities/permission/domain
```

The domain layer must stay pure:

```txt
No React
No Redux
No Router
No Chakra
No RTK Query
No browser APIs
```

## Where To Change Access Rules

Use this file first:

```txt
apps/web-fsa/src/entities/permission/domain/accessPolicy.ts
```

It owns:

```txt
ROUTE_ACCESS_POLICIES
DASHBOARD_ACCESS_PRIORITY
PROJECT_ACCESS_PERMISSIONS
WORKSPACE_ACCESS_POLICIES
```

Examples:

```txt
Change who can open /admin/users:
  update ROUTE_ACCESS_POLICIES.adminUsers

Change the first dashboard after login:
  update DASHBOARD_ACCESS_PRIORITY

Change who can see project workspaces:
  update WORKSPACE_ACCESS_POLICIES

Change project route read permissions:
  update PROJECT_ACCESS_PERMISSIONS
```

These policies describe which backend-owned permission is required for each
frontend surface. They do not assign permissions to roles. Role-to-permission
assignment belongs to the backend database and backend role services.

## Who Consumes These Policies

The route config uses centralized policies:

```txt
apps/web-fsa/src/app/router/protectedRouteConfig.ts
```

The sidebar config uses centralized route policies:

```txt
apps/web-fsa/src/widgets/sidebar/model/sidebarItems.ts
```

The sidebar runtime visibility checks use:

```txt
apps/web-fsa/src/entities/permission/application/sidebarAccess.ts
```

Protected route checks use:

```txt
apps/web-fsa/src/entities/permission/application/routeAccess.ts
```

Dashboard redirect logic uses:

```txt
apps/web-fsa/src/entities/permission/application/dashboardAccess.ts
```

The runtime access flow is:

```txt
Backend DB roles/permissions
  -> API auth/user response with effective user.permissions
  -> frontend auth state
  -> permission-only route/sidebar/dashboard checks
```

## Compatibility Wrappers

Some old imports still work through compatibility wrappers:

```txt
apps/web-fsa/src/entities/permission/model/permissionGrants.ts
apps/web-fsa/src/shared/lib/dashboard.ts
```

New code should prefer importing from `domain/` or `application/` directly.

## What Not To Do

Do not duplicate access rules in:

```txt
pages/
widgets/
features/
app/router/
```

These layers can hold UI metadata, page components, and wiring, but business
decisions should stay in the permission domain/application layer.

Do not add role-based route guards, role-based sidebar checks, or role-based
dashboard redirects. Roles can still be displayed in profile/navbar/admin
screens, and admins can still edit roles, but frontend access decisions must
use permissions.
