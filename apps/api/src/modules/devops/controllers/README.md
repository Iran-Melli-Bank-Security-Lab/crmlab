# DevOps Controllers

This folder is currently reserved for future DevOps controllers.

## Current State

There are no controller files here yet. Current DevOps routes use inline placeholder handlers in `routes/devops.routes.ts`.

## When To Add Files Here

Add controllers when DevOps logic becomes real, for example:

- deployment listing
- deployment creation
- server inventory
- deployment status updates
- deployment audit actions

## Expected Execution

Future controllers should run after:

```txt
requireAuth -> requirePermission(...) -> controller
```

Controllers should use `sendSuccess` for responses and services/models for business logic.

