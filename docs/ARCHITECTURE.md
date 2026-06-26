# Enterprise Architecture

This repository is being migrated to an enterprise monorepo architecture.

## Target Architecture

```txt
Enterprise Modular Monolith
+ Monorepo
+ Clean / Hexagonal-inspired Backend
+ Feature / Module-based Frontend
+ Shared Contract Packages
+ Database-backed RBAC/Permission System
```

## Repository Layout

```txt
apps/
  web-fsa/              Feature-Sliced React/Vite frontend application
  api/                  Backend modular monolith, to be added

packages/
  authz/                Shared role and permission constants/types
  contracts/            Shared frontend/backend API contracts

docs/                   Architecture and migration documentation
```

## Frontend Direction

The frontend uses Feature-Sliced Architecture with centralized domain policies:

```txt
apps/web-fsa/src/
  app/                  application shell, providers, store, router
  pages/                route-level pages
  widgets/              composed layout widgets, such as navbar/sidebar
  features/             user actions and business flows
  entities/             domain entities, such as user/project/notification
  shared/               UI primitives, API base utilities, generic helpers
```

The frontend app is organized with Feature-Sliced Architecture under
`apps/web-fsa`.

Business rules should be centralized in domain/application files, not duplicated
inside pages, widgets, routes, or components. The first implemented domain is
RBAC/navigation access:

```txt
apps/web-fsa/src/entities/permission/domain/accessPolicy.ts
apps/web-fsa/src/entities/permission/domain/accessRules.ts
apps/web-fsa/src/entities/permission/application/
```

See:

```txt
docs/CENTRALIZED_BUSINESS_RULES.md
```

## Backend Direction

The backend should be added under `apps/api` as one deployable modular monolith.
Internally, each module should follow Clean / Hexagonal-inspired boundaries:

```txt
apps/api/src/modules/<module>/
  domain/               entities, value objects, domain policies
  application/          use cases and ports
  infrastructure/       database, external clients, adapter implementations
  interfaces/           HTTP controllers, DTO mapping, module public API
```

Recommended first modules:

```txt
auth
users
rbac
projects
notifications
```

## Shared Contracts

Shared contracts live outside app-specific code:

```txt
packages/authz          roles, permissions, authz types
packages/contracts      request/response contracts and DTO types
```

The frontend should import app-local types from `apps/web-fsa/src/shared/types` when legacy
compatibility is needed, but new shared API shapes should be defined in
`packages/contracts`.

## RBAC Direction

The current frontend can read roles and permissions from the authenticated user,
but production authorization must be enforced by the backend.

The target RBAC system should be database-backed:

```txt
users
roles
permissions
user_roles
role_permissions
user_permission_overrides, optional
```

The frontend may hide or show UI based on permissions, but the backend must
enforce every protected action.
