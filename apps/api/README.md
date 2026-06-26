# Enterprise Dashboard Backend

Backend for the enterprise dashboard project.

## Run

```bash
cp .env.example .env
npm run dev:api
```

Run this from the repository root after `npm install`.

## Seed Admin

```bash
npm run seed:api
```

Admin login:

```txt
admin@example.com
12345678
```

Full documentation:

```txt
src/docs/BACKEND_ARCHITECTURE.md
src/docs/BACKEND_EXECUTION_FLOW.md
```

## CSRF

Login/register return a `csrfToken`. Send it on unsafe authenticated requests:

```http
x-csrf-token: <csrfToken>
```

After a page reload, request a fresh token with `GET /api/auth/csrf-token`.

## Sessions

Tokens are bound to the user and a `sessionVersion`. Refresh tokens are stored as hashed sessions and rotate on refresh. The backend reloads the live user before authorizing requests, so stale tokens lose access after role/permission changes.

## API Shape

Successful responses use `{ "success": true, "data": ... }`. Errors use `{ "success": false, "error": { "message": "..." } }`.
