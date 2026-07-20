# Backend Enterprise Architecture Audit

Audit date: 2026-07-20

Scope: `apps/api`, backend-facing shared packages, and relevant deployment/runtime configuration.

## Executive summary

The backend has a useful modular-monolith foundation, centralized authentication and authorization concepts, schema validation, compatibility handling for legacy data, and a passing TypeScript check. It is not enterprise-production-ready in its current state.

Production deployment is blocked by two critical security vulnerabilities:

1. Public callers can select privileged roles during registration, and a separate unauthenticated admin-registration endpoint is exposed.
2. Avatar uploads are unauthenticated, upload validation trusts client-provided MIME metadata, and any authenticated user can delete any known upload filename.

The main architectural risks after those blockers are non-atomic multi-document workflows, race-prone refresh-token rotation, incomplete graceful shutdown and readiness behavior, best-effort audit logging, weak module boundaries, and insufficient operational observability.

Overall assessment: **good prototype/modular-monolith foundation, but security, consistency, and operational-resilience gaps block enterprise readiness.**

## Findings

### P0 — Public privilege escalation

Public registration accepts caller-selected roles, including `admin`:

- `apps/api/src/modules/auth/validators/auth.validators.ts:19`
- `apps/api/src/modules/auth/services/auth.service.ts:15`
- `apps/api/src/modules/auth/services/auth.service.ts:30`

Those roles are persisted directly and used to generate default permissions. A separate unauthenticated admin-registration endpoint is also exposed:

- `apps/api/src/modules/auth/routes/auth.routes.ts:17`
- `apps/api/src/modules/auth/controllers/auth.controller.ts:36`

Impact: an unauthenticated caller can create a privileged account and obtain an authenticated admin session.

Required remediation:

- Remove roles from the public registration contract.
- Assign a server-controlled default role.
- Remove the public admin-registration route.
- Implement admin creation through an authenticated privileged workflow or a one-time deployment-controlled bootstrap command.
- Add route-level tests proving anonymous callers cannot select roles or create administrators.

### P0 — Unsafe upload authorization and storage

Avatar upload is unauthenticated:

- `apps/api/src/modules/uploads/routes/upload.routes.ts:48`

Any authenticated user can delete any known upload filename because deletion performs no ownership or permission check:

- `apps/api/src/modules/uploads/controllers/upload.controller.ts:72`

Upload validation trusts the client-provided MIME type, retains the original extension, writes directly to local disk, and serves all files publicly through Express:

- `apps/api/src/modules/uploads/routes/upload.routes.ts:18`
- `apps/api/src/modules/uploads/routes/upload.routes.ts:28`
- `apps/api/src/app/app.ts:72`

Impact: anonymous storage abuse, cross-user deletion, spoofed file content, untracked orphan files, and poor compatibility with horizontally scaled or ephemeral deployments.

Required remediation:

- Require authentication and explicit upload permissions.
- Persist owner, purpose, checksum, media type, size, and lifecycle state.
- Authorize deletion against ownership and entity references.
- Inspect file signatures rather than trusting multipart MIME metadata.
- Generate server-controlled extensions and content disposition.
- Add malware scanning and quarantine where appropriate.
- Store files in private object storage and issue short-lived signed URLs.

### P1 — Multi-document workflows are not atomic

Project creation sequentially mutates projects, users, assignments, notifications, realtime state, and audit records:

- `apps/api/src/modules/projects/controllers/project.controller.ts:509`
- `apps/api/src/modules/projects/controllers/project.controller.ts:546`
- `apps/api/src/modules/projects/controllers/project.controller.ts:568`
- `apps/api/src/modules/projects/controllers/project.controller.ts:576`

Assignment replacement similarly performs independent deletes, upserts, project updates, user updates, notifications, realtime events, and audit writes:

- `apps/api/src/modules/projects/controllers/project.controller.ts:629`
- `apps/api/src/modules/projects/controllers/project.controller.ts:809`
- `apps/api/src/modules/projects/controllers/project.controller.ts:860`
- `apps/api/src/modules/projects/controllers/project.controller.ts:884`

Vulnerability creation and work-session creation also update multiple records without a transaction:

- `apps/api/src/modules/pentest/controllers/pentest.controller.ts:113`
- `apps/api/src/modules/pentest/controllers/pentest.controller.ts:132`
- `apps/api/src/modules/pentest/controllers/pentest.controller.ts:159`
- `apps/api/src/modules/pentest/controllers/pentest.controller.ts:252`

Impact: a late failure can return an error after partially committing business state. Client retries may then duplicate data or produce conflicting state.

Required remediation:

- Define aggregate boundaries and invariants explicitly.
- Use MongoDB transactions for required synchronous mutations.
- Use a transactional outbox for audit events, notifications, and realtime delivery.
- Add idempotency keys to retryable commands.
- Make event consumers idempotent and observable.

### P1 — Refresh-token rotation is race-prone

Refresh-token processing reads the current session, creates a replacement session, and revokes the old session afterward:

- `apps/api/src/modules/auth/services/session.service.ts:81`
- `apps/api/src/modules/auth/services/session.service.ts:91`
- `apps/api/src/modules/auth/services/session.service.ts:101`
- `apps/api/src/modules/auth/services/session.service.ts:106`

Concurrent requests using the same refresh token can both observe an active session and create separate valid successors.

Required remediation:

- Atomically consume the old session with a conditional update.
- Create the successor in the same transaction.
- Track refresh-token families and reuse detection.
- Test concurrent refresh and token replay scenarios.

### P1 — Shutdown can terminate active work

The shutdown handler closes Socket.IO and immediately exits:

- `apps/api/src/server.ts:18`

It does not mark the process unready, stop HTTP acceptance, drain active requests, close MongoDB, or use a bounded shutdown timeout.

Required remediation:

- Mark the instance unready before draining.
- Call `server.close()` and wait for active requests.
- Close Socket.IO, Redis, and Mongoose connections.
- Enforce a bounded shutdown deadline.
- Handle fatal uncaught exceptions and unhandled promise rejections consistently.

### P1 — Health endpoint is not a readiness probe

The health endpoint always reports success after Express starts:

- `apps/api/src/app/app.ts:74`

It does not report MongoDB readiness, required Redis readiness, startup completion, or draining state.

Required remediation:

- Add a lightweight liveness endpoint such as `/livez`.
- Add a readiness endpoint such as `/readyz` that reflects required dependencies and shutdown state.
- Keep readiness checks bounded by short timeouts.

### P2 — Audit logging is not compliance-grade

Audit failures are logged and swallowed:

- `apps/api/src/modules/audit/services/audit.service.ts:14`
- `apps/api/src/modules/audit/services/audit.service.ts:25`

Audit records are mutable documents in the primary database. There is no guaranteed delivery, tamper evidence, retention policy, correlation identifier, or durable external sink. Some state-changing workflows, including task operations, do not emit audit events.

Required remediation:

- Emit audit events through the transactional outbox.
- Store audit data in append-only, access-controlled storage.
- Include request ID, actor, tenant or organization, action, target, result, source, and sanitized change metadata.
- Define retention, export, redaction, and incident-access policies.
- Test coverage of security-sensitive actions.

### P2 — Module boundaries are weak

The project controller is approximately 934 lines and coordinates validation, authorization-adjacent rules, persistence, users, assignments, notifications, audit, and realtime delivery. Several modules import other modules' persistence models directly.

Examples:

- `apps/api/src/modules/projects/controllers/project.controller.ts`
- `apps/api/src/middlewares/projectAccess.middleware.ts:5`
- `apps/api/src/modules/pentest/controllers/pentest.controller.ts:16`
- `apps/api/src/modules/devops/services/devopsInfo.service.ts:3`

Impact: business invariants are distributed across controllers and middleware, integration tests require broad setup, and future extraction into independently deployable services becomes risky.

Required remediation:

- Introduce application use cases or command/query handlers.
- Keep controllers limited to transport mapping.
- Expose explicit module APIs instead of allowing arbitrary cross-module model access.
- Use repository interfaces at business workflow boundaries.
- Enforce import constraints in ESLint or a dependency-boundary tool.

### P2 — Observability is development-oriented

The application uses `morgan("dev")` and scattered `console.*` statements:

- `apps/api/src/app/app.ts:70`
- `apps/api/src/middlewares/error.middleware.ts:26`
- `apps/api/src/realtime/socket.auth.ts:52`
- `apps/api/src/realtime/socket.redis.ts:40`

There are no structured logs, correlation IDs, metrics, tracing, service-level indicators, or centralized redaction rules.

Required remediation:

- Adopt structured JSON logging with consistent severity and context.
- Generate or propagate request and trace IDs.
- Redact cookies, credentials, tokens, and sensitive payload fields.
- Add latency, error, saturation, authentication, database, queue/outbox, and websocket metrics.
- Add distributed tracing around database and external dependency calls.
- Define SLOs and alert thresholds.

### P2 — Quality gate is incomplete

Verification performed during this audit:

- TypeScript type-check: passed.
- Unit tests: 39 passed, 0 failed when invoked from `apps/api`.
- Lint: failed with two errors and three warnings.

The backend package has no `test` script. Existing tests primarily cover validators, compatibility mappers, and isolated service rules. There is no meaningful route-level authorization, upload security, database integration, transaction, refresh concurrency, readiness, or shutdown coverage.

Required remediation:

- Add stable `test`, `test:unit`, and `test:integration` scripts.
- Make type-check, lint, unit tests, integration tests, and build mandatory CI checks.
- Add authorization-matrix tests for every route.
- Run MongoDB-backed workflow tests against transactions and failure injection.
- Add concurrency tests for session refresh and idempotent commands.

## Positive foundations

The following existing choices are valuable and should be retained while remediating the findings:

- Clear top-level module organization.
- Centralized environment validation with production secret checks.
- Centralized permission constants and shared authorization package.
- Zod validation on many important request paths.
- Short-lived access tokens and persisted hashed refresh sessions.
- CSRF protection for cookie-authenticated unsafe requests.
- Explicit legacy-database compatibility logic.
- Useful compound indexes on several frequently queried entities.
- Socket authentication and project/user room concepts.
- Passing TypeScript validation and 39 passing unit tests.

## Recommended implementation sequence

### Phase 0 — Production blockers

1. Remove caller-controlled roles from registration.
2. Remove or secure admin registration.
3. Secure upload creation and deletion.
4. Add authorization integration tests for all exposed routes.

### Phase 1 — Consistency and identity

1. Introduce transaction boundaries for project, assignment, vulnerability, and task workflows.
2. Implement an outbox for notifications, realtime messages, and audit events.
3. Make refresh-token rotation atomic.
4. Add command idempotency and concurrency tests.

### Phase 2 — Runtime resilience

1. Add separate liveness and readiness endpoints.
2. Implement bounded graceful shutdown.
3. Add dependency timeouts and failure handling.
4. Move uploads to durable private object storage.

### Phase 3 — Architecture and operations

1. Extract application use cases from large controllers.
2. Enforce module import boundaries.
3. Adopt structured observability and SLOs.
4. Make audit storage durable and compliance-oriented.
5. Enforce all quality gates in CI.

## Target architecture

The appropriate near-term target is a disciplined modular monolith, not an immediate microservice split:

```text
HTTP / Socket adapters
        |
Application commands and queries
        |
Domain policies and aggregate invariants
        |
Repository and infrastructure interfaces
        |
MongoDB transactions + transactional outbox
        |
Async notification, realtime, and audit consumers
```

This preserves operational simplicity while establishing boundaries, consistency guarantees, and observability suitable for later service extraction if scale or ownership requires it.
