# User Services

This folder is currently reserved for future user service logic.

## Current State

There are no user service files yet. User management behavior currently lives in `controllers/user.controller.ts`, and authentication-specific user behavior lives in the auth services.

## When To Add Files Here

Add service files here when user business logic becomes reusable, for example:

- profile update rules
- account deactivation
- password reset
- session revocation across devices
- user search/filtering logic

## Expected Execution

Future user services should be called by controllers or other modules. They should not directly send Express responses.

