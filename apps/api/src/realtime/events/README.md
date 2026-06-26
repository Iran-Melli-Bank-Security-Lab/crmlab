# Realtime Events Folder

This folder is currently reserved for future event-specific Socket.IO handlers.

## Current State

There are no event files here yet. Current realtime behavior is handled in `realtime/socket/server.ts` and `modules/notifications/services/notification.service.ts`.

## When To Add Files Here

Add files when realtime behavior grows, for example:

- notification event handlers
- project collaboration events
- ticket live updates
- deployment status streams
- QA test run events

## Expected Execution

Future event modules should be imported by `setupSocket` or a socket event registrar. They should attach listeners or emitters after Socket.IO is initialized.

