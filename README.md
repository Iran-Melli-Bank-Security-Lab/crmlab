# Role Dashboard Project Enterprise

Enterprise dashboard platform migrating to:

- Enterprise Modular Monolith
- Monorepo
- Clean / Hexagonal-inspired Backend
- Feature / Module-based Frontend
- Shared Contract Packages
- Database-backed RBAC/Permission System

The current frontend lives in `apps/web-fsa` and follows Feature-Sliced
Architecture. Shared packages hold contracts and authorization constants.

## Repository Layout

```txt
apps/
  web-fsa/              Feature-Sliced React + Vite frontend
  api/                  planned backend modular monolith

packages/
  authz/                shared roles and permissions
  contracts/            shared API contracts and DTO types

docs/                   architecture and migration documentation
```

## Frontend Includes

- React + Vite
- TypeScript
- React Router
- Redux Toolkit
- RTK Query
- Multi-role users
- Permission-based access control
- Protected routes
- Public routes
- MSW API mocking
- Error Boundary
- Chakra UI design system
- Admin Role/Permission Management UI

## Run

```bash
npm install
cp apps/web-fsa/.env.example apps/web-fsa/.env
cp apps/api/.env.example apps/api/.env
npm run dev
```

The root `dev` script runs both the frontend and backend together.

## Scripts

```bash
npm run build
npm run typecheck
npm run lint
npm run format
```

Run apps separately:

```bash
npm run dev:web
npm run dev:api
```

## Chakra UI

The UI is built with Chakra UI. The theme is here:

```txt
apps/web-fsa/src/shared/theme/index.ts
```

The app is wrapped with `ChakraProvider` in:

```txt
apps/web-fsa/src/app/main.tsx
```

Shared app components are here:

```txt
apps/web-fsa/src/shared/ui/primitives/Button.tsx
apps/web-fsa/src/shared/ui/primitives/Input.tsx
apps/web-fsa/src/shared/ui/primitives/Select.tsx
apps/web-fsa/src/shared/ui/primitives/Card.tsx
apps/web-fsa/src/shared/ui/primitives/Badge.tsx
```

## Documentation

Full architecture notes are in:

```txt
docs/ARCHITECTURE.md
docs/MONOREPO_RUNBOOK.md
docs/PROJECT_EXPLAINED_FROM_ZERO.md
docs/CENTRALIZED_BUSINESS_RULES.md
docs/PERMISSION_REGISTRY_WORKFLOW.md
docs/MIGRATION_REPORT.md
docs/FSA_MIGRATION_REPORT.md
docs/AGENTS.md
```
