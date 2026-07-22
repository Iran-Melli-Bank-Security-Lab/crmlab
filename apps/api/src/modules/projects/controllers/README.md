# Project Controllers

This folder contains HTTP handlers for project operations.

## Files

### `project.controller.ts`

Exports:

- `getProjects`
- `getProject`
- `createProject`
- `assignUsersToProject`

When it runs:

- Runs after route-level auth, permission, project access, and validation middleware.

Handler details:

#### `getProjects`

Returns accessible projects newest-first by default for every project-list view.

- Admin users receive all projects.
- Non-admin users receive projects they own or are assigned to.
- Uses `ProjectModel.find(...)`.
- Returns normalized project objects through `sendSuccess`.

#### `getProject`

- Returns core non-sensitive identity fields, including project type and
  platform, to every authorized project-detail viewer.
- Keeps table column-visibility settings from removing required detail fields.

#### `createProject`

- Creates a project from request body.
- Sets `ownerId` to current authenticated user.
- Creates and links the initial manager assignments.
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
