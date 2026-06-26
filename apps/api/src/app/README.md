# App Folder

This folder owns Express application construction.

## Files

### `app.ts`

`createApp()` builds the Express application. It is called once from `src/server.ts` after MongoDB connects.

What happens inside `createApp()`:

1. Creates the Express app instance.
2. Registers global middleware:
   - `helmet()` for HTTP security headers.
   - `cors()` for frontend origin and credential support.
   - `cookieParser()` so cookies are available on `req.cookies`.
   - `express.json()` and `express.urlencoded()` for body parsing.
   - `csrfProtection` before route handlers.
   - `morgan()` for request logging.
   - `rateLimit()` for general API protection.
3. Serves static uploaded files through `/uploads`.
4. Registers the health endpoint.
5. Mounts feature routes:
   - auth
   - audit logs
   - users
   - projects
   - notifications
   - upload
   - pentest
   - devops
   - tickets
   - QA
6. Registers `notFoundHandler` and `errorHandler` last.

Why this file matters:

- Middleware order is critical. For example, `cookieParser` must run before auth/CSRF logic because those features read cookies.
- Routes must be mounted before not-found/error handlers.
- This file defines the top-level HTTP shape of the backend.

