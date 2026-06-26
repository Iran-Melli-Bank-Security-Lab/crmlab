# Project Models

This folder defines project persistence.

## Files

### `project.model.ts`

Defines `ProjectModel`.

When it runs:

- Schema is registered when imported.
- Queries run when controllers or project-access middleware use the model.

Fields:

- `projectName`: project name.
- `type`: canonical project category for all new writes.
- `projectType`: legacy read-compatible category; new documents do not write it.
- `description`: optional description.
- `status`: project lifecycle status.
- `ownerId`: user who owns the project.
- `identifier`: project identifier/report metadata.
- `projectManager`, `qualityManager`, `devops`: project-level manager references.
- `assignedUserIds`, `userProject`: temporary legacy assignment references.

Indexes:

- `projectName + version` unique when both legacy fields exist.
- owner/status, type/status, manager/status, legacy assigned users, letter number, and identifier doc id.

### `projectAssignment.model.ts`

Defines `ProjectAssignmentModel`.

It maps to the existing MongoDB `projectusers` collection for compatibility.

Fields:

- `projectId` / `project`: assigned project.
- `userId` / `pentester`: assigned user.
- `managerId` / `manager`: manager responsible for the assignment.
- `assignedById`: user who created the assignment.
- `assignmentRole`: assignment role such as pentester, QA, devops, or manager.
- `status`, `progress`, work dates, state changes, and total work time.
- `bugScopes`: fixed-size embedded OWASP scope tree.

Indexes:

- unique project/user/version/role for new fields.
- unique project/pentester/version for legacy fields.
- user/status, project/status, manager/status, role/status, bug scope WSTG/status, and date indexes.

Why it exists:

- Projects define project metadata; assignments define user work on each project.
