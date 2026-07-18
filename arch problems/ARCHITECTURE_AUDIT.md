# Architecture Audit After Legacy MongoDB Integration

Date: 2026-07-18

Scope: Read-only review of the frontend, backend, shared packages, deployment
configuration, and compatibility logic used with the legacy MongoDB `test`
database.

## Executive summary

The backend has domain-oriented modules, but controllers and services access
Mongoose directly and compatibility behavior is spread across models,
controllers, and response mappers. The frontend follows a Feature-Sliced layout
in name, but several imports violate its dependency direction. Shared contracts
exist but are not enforced by the backend.

The audit found 3 critical issues, 7 high-severity issues, 5 medium-severity
issues, and 1 low-severity issue.

## Findings

### 1. Production database selection is not deterministic

- Severity: Critical
- Problem: Production can receive a MongoDB URI for `enterprise_dashboard`
  while expecting `test`, causing startup failure.
- Root cause: PM2 state, `.env`, the URI path, deployment rewriting, and
  `LEGACY_DATABASE_NAME` can disagree. The current connection does not pass the
  database name explicitly to the MongoDB driver.
- Affected files:
  - `apps/api/src/db/connect.ts`
  - `apps/api/src/config/env.ts`
  - `apps/api/src/db/diagnoseLegacyCompatibility.ts`
  - `deploy/setup-server.sh`
  - `ecosystem.config.cjs`
- Recommended solution: Establish one authoritative configuration, pass the
  expected database explicitly to the driver, and make runtime diagnostics use
  the same connection path.
- Risk to legacy compatibility: High. Verify the resolved database and
  collections read-only before deploying.
- Recommended implementation order: 1

### 2. Public registration permits privilege escalation

- Severity: Critical
- Problem: An unauthenticated caller can use the public admin registration
  endpoint or submit privileged roles through normal registration.
- Root cause: `/register-admin` has no authorization, and normal registration
  accepts caller-controlled roles including `admin`.
- Affected files:
  - `apps/api/src/modules/auth/routes/auth.routes.ts`
  - `apps/api/src/modules/auth/validators/auth.validators.ts`
  - `apps/api/src/modules/auth/services/auth.service.ts`
  - `apps/web-fsa/src/pages/signup/Signup.tsx`
- Recommended solution: Remove roles from public registration. Disable admin
  registration after controlled bootstrap or protect it with authenticated
  admin permission. Add dedicated login and registration rate limits.
- Risk to legacy compatibility: Low for database structure; operational impact
  must be checked if public onboarding is currently used.
- Recommended implementation order: 2

### 3. Legacy active users are rejected after login

- Severity: Critical
- Problem: Legacy users with `status: "Active"` and no `isActive` can pass login
  but fail access-token validation. The same users are excluded from project and
  task assignment queries.
- Root cause: Different modules use incompatible definitions of an active user.
- Affected files:
  - `apps/api/src/modules/auth/services/session.service.ts`
  - `apps/api/src/modules/auth/services/auth.service.ts`
  - `apps/api/src/modules/projects/controllers/project.controller.ts`
  - `apps/api/src/modules/tasks/controllers/task.controller.ts`
  - `apps/api/src/modules/users/models/user.model.ts`
- Recommended solution: Define one compatible active-user predicate and one
  MongoDB filter that supports canonical and legacy status fields. Use them in
  every authentication and assignment path.
- Risk to legacy compatibility: High. Incorrect normalization could reactivate
  intentionally disabled accounts.
- Recommended implementation order: 3

### 4. Upload and POC authorization is insufficient

- Severity: High
- Problem: Avatar uploads are unauthenticated, POC files are served publicly,
  and any authenticated user can delete a file without ownership checks.
- Root cause: Public avatars and sensitive POCs share one directory and static
  route. MIME validation trusts request headers.
- Affected files:
  - `apps/api/src/modules/uploads/routes/upload.routes.ts`
  - `apps/api/src/modules/uploads/controllers/upload.controller.ts`
  - `apps/api/src/modules/pentest/middlewares/pocUpload.middleware.ts`
  - `apps/api/src/app/app.ts`
- Recommended solution: Separate public and protected uploads, require
  ownership or project access, verify file signatures, and serve POCs through
  an authorized download endpoint.
- Risk to legacy compatibility: Medium. Existing POC URLs need a compatibility
  resolver or controlled migration.
- Recommended implementation order: 5

### 5. Missing legacy roles silently become pentester permissions

- Severity: High
- Problem: Users with absent or unknown roles default to `pentester`; login can
  also create permission records in the legacy database.
- Root cause: `normalizeRoles()` uses a privileged fallback and authentication
  calls get-or-create permission logic.
- Affected files:
  - `apps/api/src/modules/users/models/user.model.ts`
  - `apps/api/src/modules/users/services/userAuth.service.ts`
  - `apps/api/src/modules/users/services/role.service.ts`
- Recommended solution: Use a no-access or explicitly unmapped legacy role,
  report ambiguous mappings for review, and move permission provisioning out of
  authentication reads.
- Risk to legacy compatibility: High because role mapping controls access for
  existing users.
- Recommended implementation order: 4

### 6. Multi-collection workflows are not atomic

- Severity: High
- Problem: Project creation, assignments, findings, assessments, notifications,
  user references, and file changes can partially complete.
- Root cause: Sequential writes occur in controllers without transactions or a
  durable compensating workflow.
- Affected files:
  - `apps/api/src/modules/projects/controllers/project.controller.ts`
  - `apps/api/src/modules/pentest/controllers/pentest.controller.ts`
  - `apps/api/src/modules/notifications/services/notification.service.ts`
- Recommended solution: Introduce application services with transactions when
  MongoDB uses a replica set. For standalone deployments, use idempotent
  operations, workflow states, and compensating actions.
- Risk to legacy compatibility: High. Transaction support depends on the actual
  MongoDB topology.
- Recommended implementation order: 6

### 7. Refresh-token requests can race

- Severity: High
- Problem: Multiple concurrent 401 responses can rotate the same refresh token,
  then trigger replay handling that revokes valid sessions.
- Root cause: Every RTK Query request refreshes independently while the backend
  performs rotating refresh tokens.
- Affected files:
  - `apps/web-fsa/src/shared/api/baseApi.ts`
  - `apps/api/src/modules/auth/services/session.service.ts`
- Recommended solution: Add a frontend single-flight refresh mutex and make
  backend token replacement atomic.
- Risk to legacy compatibility: Low; session data is application-owned.
- Recommended implementation order: 7

### 8. Finding compatibility hooks can overwrite legacy data

- Severity: High
- Problem: Saving a legacy finding can replace legacy securing-method booleans
  with values derived from an absent or empty canonical array.
- Root cause: Schema validation hooks perform bidirectional compatibility writes
  without knowing whether a canonical field was intentionally modified.
- Affected files:
  - `apps/api/src/modules/pentest/models/vulnerability.model.ts`
  - `apps/api/src/modules/pentest/services/vulnerabilityCompatibility.service.ts`
- Recommended solution: Use explicit read and write mappers. Preserve existing
  aliases unless their canonical values were intentionally changed. Add
  round-trip tests for real legacy documents.
- Risk to legacy compatibility: High due to direct data-loss potential.
- Recommended implementation order: 8

### 9. Application-owned collections are implicit

- Severity: High
- Problem: Only four legacy collections are centrally mapped. Sessions, roles,
  permissions, audits, scopes, tasks, settings, and DevOps data rely on Mongoose
  naming and may be created inside `test` implicitly.
- Root cause: There is no complete collection ownership registry.
- Affected files:
  - `apps/api/src/constants/legacyCollections.ts`
  - `apps/api/src/modules/auth/models/authSession.model.ts`
  - `apps/api/src/modules/users/models/userPermission.model.ts`
  - `apps/api/src/modules/users/models/role.model.ts`
  - Other application-owned Mongoose models
- Recommended solution: Register explicit names for both legacy-owned and
  application-owned collections and validate their expected ownership at
  startup.
- Risk to legacy compatibility: High. Renaming already-created collections can
  orphan application data.
- Recommended implementation order: 9

### 10. Unbounded reads and unmanaged indexes will become bottlenecks

- Severity: High
- Problem: Users, projects, and findings return complete result sets. Frontend
  pagination happens after all data is downloaded. Schema indexes are declared
  while automatic index creation is disabled.
- Root cause: No server-side pagination contract and no reviewed index deployment
  process for the legacy database.
- Affected files:
  - `apps/api/src/modules/users/controllers/user.controller.ts`
  - `apps/api/src/modules/projects/controllers/project.controller.ts`
  - `apps/api/src/modules/pentest/controllers/pentest.controller.ts`
  - `apps/web-fsa/src/entities/project/ui/table/ProjectTableBase.tsx`
- Recommended solution: Add bounded cursor pagination and stable sorting. Audit
  indexes read-only, then deploy approved indexes through an explicit migration.
- Risk to legacy compatibility: High for index creation; low for additive
  pagination contracts.
- Recommended implementation order: 10

### 11. Parsed validation output is discarded

- Severity: Medium
- Problem: Zod validation succeeds, but transformed, trimmed, defaulted, or
  stripped values are not assigned back to the request. Some controllers parse
  again while others trust the original body.
- Root cause: The validation middleware checks `safeParse()` but discards
  `parsed.data`.
- Affected files:
  - `apps/api/src/middlewares/validate.middleware.ts`
  - Project, pentest, task, auth, and user validators/controllers
- Recommended solution: Introduce a typed validated-request abstraction and
  consistently use parsed body, params, and query data.
- Risk to legacy compatibility: Medium because normalization can change accepted
  legacy aliases.
- Recommended implementation order: 11

### 12. API contracts and error envelopes drift

- Severity: Medium
- Problem: Shared contracts are primarily frontend types. Backend responses are
  inferred, and frontend error helpers expect `data.message` while the backend
  sends `data.error.message`.
- Root cause: `packages/contracts` is not enforced by backend serializers and
  permissive frontend normalizers accept multiple historical response shapes.
- Affected files:
  - `packages/contracts/src/api.ts`
  - `apps/api/src/utils/response.ts`
  - `apps/web-fsa/src/features/auth/api/authApi.ts`
  - `apps/web-fsa/src/shared/lib/getApiErrorMessage.ts`
- Recommended solution: Define shared success/error envelopes and domain DTOs,
  compile both sides against them, and remove fallback formats gradually.
- Risk to legacy compatibility: Low if server-side DTO adapters retain aliases.
- Recommended implementation order: 12

### 13. Controllers contain business and persistence orchestration

- Severity: Medium
- Problem: Controllers query multiple modules, normalize legacy values, make
  authorization decisions, update several collections, send notifications, and
  emit socket events. There is no repository layer.
- Root cause: Module boundaries are organizational rather than enforced.
- Affected files:
  - `apps/api/src/modules/projects/controllers/project.controller.ts`
  - `apps/api/src/modules/pentest/controllers/pentest.controller.ts`
  - `apps/api/src/modules/users/controllers/user.controller.ts`
- Recommended solution: Extract application use cases first, then introduce
  narrow persistence adapters that encapsulate canonical and legacy queries.
- Risk to legacy compatibility: Medium to high. Every legacy alias query must be
  preserved during extraction.
- Recommended implementation order: 13

### 14. Frontend boundaries and form management are inconsistent

- Severity: Medium
- Problem: `shared` imports feature code, entities import features, types cross
  API/model layers, and large forms mix business rules, translation content,
  validation, API orchestration, and rendering.
- Root cause: Feature-Sliced dependency direction is not enforced and form
  architecture varies between React Hook Form and manual state.
- Affected files:
  - `apps/web-fsa/src/shared/api/baseApi.ts`
  - `apps/web-fsa/src/pages/create-project/CreateProject.tsx`
  - `apps/web-fsa/src/entities/pentest/ui/modules/FindingReportModal.tsx`
  - `apps/web-fsa/src/entities/pentest/model/workspace.ts`
  - `apps/web-fsa/src/features/language/model/index.tsx`
- Recommended solution: Enforce import boundaries, move cross-cutting language
  primitives to `shared`, split large pages by use case, and derive form schemas
  from shared contracts where practical.
- Risk to legacy compatibility: Low if request payloads remain stable.
- Recommended implementation order: 14

### 15. Logging is unstructured

- Severity: Medium
- Problem: Production uses `morgan("dev")` and scattered console calls without
  request IDs, structured fields, or a complete redaction policy.
- Root cause: No centralized logger or observability contract.
- Affected files:
  - `apps/api/src/app/app.ts`
  - `apps/api/src/realtime/socket.auth.ts`
  - `apps/api/src/modules/audit/services/audit.service.ts`
  - `apps/api/src/middlewares/error.middleware.ts`
- Recommended solution: Add structured logging, request correlation, explicit
  secret/PII redaction, and an audit-failure policy.
- Risk to legacy compatibility: Low.
- Recommended implementation order: 15

### 16. Frontend store has a circular type dependency

- Severity: Low
- Problem: The store imports the notification reducer while the notification
  slice imports `RootState` from the store.
- Root cause: Feature selectors depend on app composition types.
- Affected files:
  - `apps/web-fsa/src/app/store/store.ts`
  - `apps/web-fsa/src/features/notifications/model/notificationsSlice.ts`
- Recommended solution: Type selectors against a local state interface or move
  shared store types to a module that does not import feature reducers.
- Risk to legacy compatibility: None.
- Recommended implementation order: 16

## Recommended phased order

1. Stabilize production connection to `test`.
2. Close public privilege escalation.
3. Centralize legacy active-user semantics.
4. Correct legacy role and permission mapping.
5. Protect uploads and POC evidence.
6. Add legacy finding round-trip tests before changing compatibility writes.
7. Make multi-document workflows atomic or compensating.
8. Serialize refresh-token operations.
9. Register application-owned collections explicitly.
10. Add pagination and a reviewed index plan.
11. Standardize validation and contracts.
12. Decompose controllers and large frontend modules.
13. Enforce dependency boundaries and improve logging.

## Audit coverage

- 341 source files were structurally inventoried.
- Detailed review covered backend configuration, connection logic, legacy
  diagnostics, models, routes, controllers, services, validation,
  authentication, authorization, uploads, errors, logging, notifications,
  projects, pentest, users, tasks, settings, DevOps, and audit paths.
- Frontend review covered routing guards, Redux and RTK Query, authentication,
  API normalization, project and pentest state, form management, notification
  realtime state, shared contracts, types, and large components.
- Backend and frontend TypeScript checks passed.
- Dependency scan found no backend cycles and one frontend type cycle.

## Recommended next step

Implement only the first three issues in the first remediation phase. Before
changing behavior, capture read-only fixtures representing real legacy users,
projects, assignments, and findings so compatibility can be verified without
mutating production data.
