# Agent Guide

This repository is an enterprise monorepo.

## Main Locations

```txt
apps/web-fsa              Feature-Sliced React frontend
packages/authz            shared roles and permissions
packages/contracts        shared API contracts
docs                      architecture notes
```

`apps/api` is the planned backend location.

## Commands

Run from the repository root:

```bash
npm run dev
npm run dev:web
npm run dev:api
npm run build
npm run build:web
npm run build:api
npm run typecheck
npm run typecheck:web
npm run typecheck:api
```

## Import Rules

Use these aliases in the frontend:

```txt
@/*                       apps/web-fsa/src/*
@role-dashboard/authz     packages/authz/src
@role-dashboard/contracts packages/contracts/src
```

New role and permission definitions should be added to `packages/authz`.
New frontend/backend API contracts should be added to `packages/contracts`.

Business access rules should be changed in:

```txt
apps/web-fsa/src/entities/permission/domain/accessPolicy.ts
```

Detailed guide:

```txt
docs/CENTRALIZED_BUSINESS_RULES.md
```

Human-friendly full project explanation:

```txt
docs/PROJECT_EXPLAINED_FROM_ZERO.md
```

Monorepo install/run guide:

```txt
docs/MONOREPO_RUNBOOK.md
```

Permission registry and backend-owned RBAC workflow:

```txt
docs/PERMISSION_REGISTRY_WORKFLOW.md
```

## Migration Safety

Prefer small moves with verification after each phase:

```txt
typecheck
build
```

Do not remove legacy compatibility exports until all imports have been migrated.
