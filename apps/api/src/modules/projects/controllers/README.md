# Project Controllers

This folder contains HTTP handlers for project operations.

## Files

### `project.controller.ts`

Exports:

- `getProjects`
- `createProject`
- `assignUsersToProject`

When it runs:

- Runs after route-level auth, permission, project access, and validation middleware.

Handler details:

#### `getProjects`

- Admin users receive all projects.
- Non-admin users receive projects they own or are assigned to.
- Uses `ProjectModel.find(...)`.
- Returns normalized project objects through `sendSuccess`.

#### `createProject`

- Creates a project from request body.
- Sets `ownerId` to current authenticated user.
- Initializes `assignedUserIds` as empty.
- Writes `project.create` audit log.
- Returns created project with HTTP 201.

#### `assignUsersToProject`

- Reads project id from route params.
- Adds user ids to `assignedUserIds`.
- Updates assigned users' `projectIds`.
- Creates assignment notifications.
- Writes `project.assign_users` audit log.
- Returns updated project data.

Why it exists:

- Project controllers coordinate persistence, notification side effects, audit logging, and response formatting.

