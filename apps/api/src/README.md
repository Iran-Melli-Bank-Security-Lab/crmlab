# Source Folder Guide

This folder contains the complete TypeScript source code for the backend. Runtime starts from `server.ts`, then moves into app creation, database connection, route registration, middleware execution, controllers, services, models, and finally response/error handling.

## Files

### `server.ts`

This is the main backend entrypoint. It runs when the backend starts through `npm run dev` or the compiled `dist/server.js`.

Execution order:

1. Imports environment config, database connector, app factory, and Socket.IO setup.
2. Calls `connectDB()` to connect MongoDB before accepting requests.
3. Calls `createApp()` to build the Express app.
4. Wraps the Express app with `http.createServer`.
5. Calls `setupSocket(server)` so Socket.IO shares the same HTTP server.
6. Calls `server.listen(env.port)` to start accepting traffic.

If startup fails, the catch block logs the error and exits the process.

## Subfolders

- `app`: Express app construction and global middleware order.
- `config`: Environment variable loading and normalized configuration.
- `constants`: Type-safe string/status/route constants used across the backend.
- `db`: MongoDB connection and seed script.
- `docs`: Human-readable architecture and execution documentation.
- `middlewares`: Express middleware used before controllers.
- `modules`: Feature modules such as auth, users, projects, audit, notifications, pentest, uploads, and placeholders.
- `realtime`: Socket.IO realtime server and event infrastructure.
- `types`: TypeScript declaration files.
- `utils`: Shared helpers for errors, cookies, JWT, and responses.

