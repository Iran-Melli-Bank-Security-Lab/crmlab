# Project Validators

This folder contains Zod schemas for project routes.

## Files

### `project.validators.ts`

Exports:

- `createProjectSchema`
- `assignUsersSchema`

When it runs:

- Imported by `project.routes.ts`.
- Used by `validate(...)` middleware before project controllers.

Rules:

- Project creation requires `projectName`, project type, and optional description.
- User assignment requires a non-empty `userIds` array.

Why it exists:

- Controllers should not manually validate request body shape.
