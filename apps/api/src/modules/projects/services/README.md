# Project Services

This folder is currently reserved for future project service logic.

## Current State

There are no service files here yet. Current project business behavior lives in `controllers/project.controller.ts` and shared project access logic lives in `middlewares/projectAccess.middleware.ts`.

## When To Add Files Here

Add a service file when project logic becomes reusable or complex, for example:

- project status transitions
- project deletion/archive behavior
- project membership synchronization
- project reporting
- project-level audit aggregation

## Expected Execution

Future project services should be called by project controllers or by other modules that need project business rules. Services should not directly know about HTTP response objects.

