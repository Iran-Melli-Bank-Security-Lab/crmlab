# QA Controllers

This folder is currently reserved for future QA controllers.

## Current State

There are no controller files here yet. Current QA routes use inline placeholder handlers in `routes/qa.routes.ts`.

## When To Add Files Here

Add controllers when QA workflows become real, for example:

- test case creation
- test case listing
- status transitions
- assignment to QA users
- QA reporting

## Expected Execution

Future controllers should run after authentication and permission checks, then call services/models and return through `sendSuccess`.

