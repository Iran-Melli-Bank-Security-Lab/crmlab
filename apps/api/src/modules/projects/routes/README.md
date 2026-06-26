# Project Routes

This folder defines `/api/projects` endpoints.

## Files

### `project.routes.ts`

Mounted by `app.ts` at:

```txt
/api/projects
```

Route chain:

```txt
router.use(requireAuth)
GET  /                 -> requirePermission(PROJECTS_READ) -> getProjects
POST /                 -> requirePermission(PROJECTS_CREATE) -> validate(createProjectSchema) -> createProject
POST /:id/assign-users -> requireProjectAccess("params.id") -> requirePermission(PROJECTS_ASSIGN_USERS) -> validate(assignUsersSchema) -> assignUsersToProject
```

When it runs:

- Route registration runs during `createApp()`.
- Middleware/controller chain runs when a project endpoint is requested.

Why it exists:

- Keeps project endpoint declarations readable and protects them with auth, permission, access, and validation layers.

