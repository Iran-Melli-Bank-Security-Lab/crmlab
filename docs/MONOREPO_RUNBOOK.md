# Monorepo Runbook

This repository contains the frontend and backend side by side.

```txt
apps/
  web-fsa/        React/Vite frontend
  api/            Express/MongoDB backend

packages/
  authz/          shared role/permission names
  contracts/      shared API contracts and DTO types
```

## Install

Run install only from the repository root:

```bash
npm install
```

The root `package.json` has npm workspaces:

```json
{
  "workspaces": ["apps/*", "packages/*"]
}
```

That means root install installs dependencies for:

```txt
apps/web-fsa
apps/api
packages/authz
packages/contracts
```

There should be one root lockfile:

```txt
package-lock.json
```

Do not maintain separate app lockfiles.

## Environment Files

Create app-specific env files:

```bash
cp apps/web-fsa/.env.example apps/web-fsa/.env
cp apps/api/.env.example apps/api/.env
```

Default ports:

```txt
Frontend: http://localhost:5173
Backend:  http://localhost:4000
API:      http://localhost:4000/api
Socket:   http://localhost:4000/socket.io
```

## Run Frontend And Backend Together

From the repository root:

```bash
npm run dev
```

This runs both apps with `concurrently`:

```txt
API  -> npm run dev:api
WEB  -> npm run dev:web
```

## Run Separately

Frontend only:

```bash
npm run dev:web
```

Backend only:

```bash
npm run dev:api
```

## Build

Build both apps:

```bash
npm run build
```

Build only frontend:

```bash
npm run build:web
```

Build only backend:

```bash
npm run build:api
```

## Typecheck

Typecheck both apps:

```bash
npm run typecheck
```

Typecheck only frontend:

```bash
npm run typecheck:web
```

Typecheck only backend:

```bash
npm run typecheck:api
```

## Backend Seed

Seed backend data:

```bash
npm run seed:api
```

## Production Preview / Start

Preview frontend build:

```bash
npm run preview
```

Start backend build:

```bash
npm run start:api
```

## Important Rule

Use root scripts for normal work. This keeps the frontend, backend, shared
packages, and lockfile aligned.
