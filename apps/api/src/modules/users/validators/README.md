# User Validators

This folder is currently reserved for future user validation schemas.

## Current State

There are no validator files here yet. Current user routes do not use Zod validators.

## When To Add Files Here

Add validators when user-management routes need stricter request validation, for example:

- create user body schema
- update roles/permissions body schema
- profile update body schema
- password change body schema

## Expected Execution

Future validators should be imported by `users/routes/user.routes.ts` and executed through `validate(schema)` before controllers.

