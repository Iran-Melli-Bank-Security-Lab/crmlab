# Feature-Sliced Architecture Migration

## Goal

Create a professional enterprise frontend using Feature-Sliced Architecture and
make it the primary frontend app.

## App Locations

```txt
apps/web-fsa              primary Feature-Sliced frontend
```

## FSA Layers

```txt
apps/web-fsa/src/
  app/                    application shell, providers, router, store, global styles
  pages/                  route-level pages
  widgets/                composed UI blocks used by pages/layouts
  features/               user actions and product workflows
  entities/               domain entities and their API/UI/model code
  shared/                 reusable infrastructure, UI primitives, config, testing
```

## Important Path Moves

```txt
src/App.tsx                                      -> src/app/App.tsx
src/main.tsx                                     -> src/app/main.tsx
src/app/store.ts                                 -> src/app/store/store.ts
src/routes/*                                     -> src/app/router/*
src/config/appRoutes.ts                          -> src/app/router/protectedRouteConfig.ts
src/layouts/DashboardLayout.tsx                  -> src/widgets/dashboard-layout/DashboardLayout.tsx
src/layouts/PublicLayout.tsx                     -> src/widgets/public-layout/PublicLayout.tsx
src/components/Navbar.tsx                        -> src/widgets/navbar/ui/Navbar.tsx
src/components/Sidebar.tsx                       -> src/widgets/sidebar/ui/Sidebar.tsx
src/config/sidebarItems.ts                       -> src/widgets/sidebar/model/sidebarItems.ts
src/components/NotificationCenter.tsx            -> src/widgets/notification-center/ui/NotificationCenter.tsx
src/components/ProfileMenu.tsx                   -> src/widgets/profile-menu/ui/ProfileMenu.tsx
src/features/auth/authSlice.ts                   -> src/features/auth/model/authSlice.ts
src/hooks/useAuth.ts                             -> src/features/auth/model/useAuth.ts
src/services/authApi.ts                          -> src/features/auth/api/authApi.ts
src/components/AuthSessionSync.tsx               -> src/features/auth/ui/AuthSessionSync.tsx
src/components/PermissionGate.tsx                -> src/features/access-control/ui/PermissionGate.tsx
src/hooks/usePermission.ts                       -> src/features/access-control/model/usePermission.ts
src/modules/admin/components/RolePermissionManager.tsx -> src/features/user-access/ui/RolePermissionManager.tsx
src/services/usersApi.ts                         -> src/entities/user/api/usersApi.ts
src/services/projectsApi.ts                      -> src/entities/project/api/projectsApi.ts
src/components/projects/ProjectTable.tsx         -> src/entities/project/ui/ProjectTable.tsx
src/services/api.ts                              -> src/shared/api/baseApi.ts
src/components/ui/*                              -> src/shared/ui/primitives/*
src/components/ErrorBoundary.tsx                 -> src/shared/ui/feedback/ErrorBoundary.tsx
```

## Commands

Run from the repository root:

```bash
npm run dev
npm run build
npm run typecheck
```

## Current Strategy

`apps/web-fsa` is now the only frontend app. The previous reference app has been
removed.
