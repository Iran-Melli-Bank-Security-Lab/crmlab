# Codex Repository Guide

This repository has a persistent navigation index. Use it before broad searches.

## Required navigation workflow

1. Read this file at the start of a repository task.
2. Read `.codex/project-index.json` for machine-readable lookup, or the relevant domain in `docs/PROJECT_INDEX.md` for a concise architecture view.
3. Locate likely files through indexed domains, keywords, symbols, endpoints, and relationships.
4. Use targeted `rg` or `git ls-files` only when the index is insufficient, stale, or the task needs exact implementation details.
5. Run `npm run index:project` after adding, removing, renaming, or moving structural files. Include regenerated index changes with the code change.

Do not treat the index as a replacement for code search or source inspection. It is a fast navigation layer. Verify implementation details in source before editing.

Validate the index without rewriting it:

```bash
npm run index:project:check
```

Force a complete re-analysis when generator rules change:

```bash
npm run index:project -- --full
```

Generated/build/runtime directories such as `node_modules`, `dist`, coverage, logs, uploads, caches, and `.git` must not be indexed.

## Repository boundaries

- `apps/api`: Express, MongoDB/Mongoose, Socket.IO backend.
- `apps/web-fsa`: Feature-Sliced React frontend with Redux Toolkit Query.
- `packages/authz`: shared roles, permissions, and grants.
- `packages/contracts`: shared API and project-responsibility contracts.
- `deploy`: PM2, Nginx, HTTP/HTTPS production setup.
- `docs`: architecture, RBAC, migration, compatibility, and runbook documentation.

Preserve legacy database compatibility unless a migration explicitly removes it. Prefer small changes followed by focused tests, typechecks, and proportional builds.
