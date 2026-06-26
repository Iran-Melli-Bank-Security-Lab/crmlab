# Types Folder

This folder contains TypeScript declaration files. These files are used at compile time and do not run at runtime.

## Files

### `express.d.ts`

Extends Express global types.

What it adds:

- `Express.UserContext`
- `req.user`
- `req.project`

Why it exists:

- Auth middleware attaches the live user to `req.user`.
- Project access middleware attaches the loaded project to `req.project`.
- Controllers need TypeScript to understand those properties.

### `cookie.d.ts`

Declares the `cookie` module shape.

What it adds:

- `parse(cookieHeader: string): Record<string, string>`

Why it exists:

- Socket.IO auth uses `cookie.parse(...)`.
- This file keeps TypeScript aware of that module API.

