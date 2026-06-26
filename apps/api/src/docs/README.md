# Docs Folder

This folder contains human-readable documentation for the backend.

## Files

### `BACKEND_ARCHITECTURE.md`

High-level architecture documentation.

Use it when:

- You want to understand the backend stack.
- You want to see major features and API groups.
- You want a summary of auth, authorization, notifications, audit logs, CSRF, and production notes.

### `BACKEND_EXECUTION_FLOW.md`

Deep execution-flow documentation.

Use it when:

- You want to know exactly what runs first.
- You want to understand how requests move from server startup to middleware, routes, controllers, services, models, and response helpers.
- You want file-by-file explanations of the current backend.

### Folder README files

Most source folders now also include local `README.md` files. Those local files explain the files inside that specific folder and when they run.

Why this folder exists:

- It keeps broad architectural and execution documentation separate from source code.

