# Migration Report

## Phase 1: Monorepo Foundation

Completed changes:

```txt
src/                         -> apps/web-fsa/src/
index.html                   -> apps/web-fsa/index.html
vite.config.ts               -> apps/web-fsa/vite.config.ts
```

Root scripts now run the frontend through the config inside `apps/web-fsa`.

```txt
npm run dev
npm run build
npm run typecheck
```

## Shared Packages Added

```txt
packages/authz
packages/contracts
```

`packages/authz` now owns:

```txt
ROLES
PERMISSIONS
Role
Permission
```

The previous frontend files still exist as compatibility re-exports:

```txt
apps/web-fsa/src/entities/permission/model/roles.ts
apps/web-fsa/src/entities/permission/model/permissions.ts
```

`packages/contracts` now owns the first shared API contracts:

```txt
AuthResponseContract
LoginRequestContract
RegisterRequestContract
UserContract
UserFormPayloadContract
RolesAndPermissionsContract
UploadResponseContract
ApiErrorContract
```

## Important Fix

The frontend HTML entry now points to the TypeScript entry file:

```txt
apps/web-fsa/index.html -> /src/app/main.tsx
```

## Still To Do

Next phases:

```txt
1. Move frontend internals toward feature/module structure.
2. Add or move backend into apps/api.
3. Implement backend modules: auth, users, rbac, projects, notifications.
4. Move RBAC enforcement to backend/database.
5. Replace remaining frontend-only permission assumptions with backend data.
```
