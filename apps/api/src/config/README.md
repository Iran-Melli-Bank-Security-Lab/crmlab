# Config Folder

This folder centralizes runtime configuration.

## Files

### `env.ts`

This file loads environment variables and exports a normalized `env` object.

When it runs:

- It runs as soon as any file imports `env`.
- In normal startup, it is imported very early by `server.ts`, `app.ts`, database connection, cookie utilities, JWT utilities, and Socket.IO setup.

What it does:

1. Calls `dotenv.config()` to load `.env`.
2. Reads environment variables from `process.env`.
3. Provides development defaults for local use.
4. Exports:
   - `env`
   - `isProduction`

Important values:

- `port`: HTTP server port.
- `clientUrl`: allowed frontend origin for CORS and Socket.IO.
- `mongoUri`: MongoDB connection string.
- `jwtAccessSecret`: access-token signing secret.
- `jwtRefreshSecret`: refresh-token signing secret.
- `csrfSecret`: CSRF token signing secret.
- `accessTokenTtl`: access token lifetime.
- `refreshTokenTtl`: refresh token lifetime.
- `cookieDomain`: optional cookie domain.
- `uploadDir`: upload directory path.

Why this file matters:

- It prevents scattered direct reads from `process.env`.
- It gives the rest of the backend a single typed configuration source.

