# DB Folder

This folder contains MongoDB connection and seed logic.

## Files

### `connect.ts`

Exports `connectDB()`.

When it runs:

- Called by `src/server.ts` during normal backend startup.
- Called by `src/db/seed.ts` during seed execution.

What it does:

1. Sets Mongoose `strictQuery` to `true`.
2. Connects to `env.mongoUri`.
3. Logs `MongoDB connected` on success.

Why it exists:

- Database connection behavior should be centralized instead of repeated in multiple entrypoints.

### `seed.ts`

Seed script for the initial admin user.

When it runs:

- Only when `npm run seed` is executed.

What it does:

1. Connects to MongoDB with `connectDB()`.
2. Hashes the default password `12345678`.
3. Upserts the admin user with `admin@example.com`.
4. Assigns `ROLES.ADMIN`.
5. Exits the process.

Why it exists:

- The project needs a known admin account for local development and first-time setup.

