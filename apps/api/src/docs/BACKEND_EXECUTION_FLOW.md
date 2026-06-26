# Backend Execution Flow

This document explains how the backend starts, which files are loaded first, how requests move through the system, and what each source file is responsible for. It is written as a future-reading guide: when you return to the project later, you should be able to identify why a file exists, when it runs, and how it participates in the backend lifecycle.

## 1. Runtime Entry Points

The backend has three practical entry points:

```txt
npm run dev       -> tsx watch src/server.ts
npm run build     -> tsc
npm run start     -> node dist/server.js
npm run seed      -> tsx src/db/seed.ts
```

The normal API server starts from `src/server.ts`. The seed command starts from `src/db/seed.ts`. TypeScript path aliases such as `@/config/env` resolve from `src` because `tsconfig.json` sets `baseUrl` to `src`.

## 2. High-Level Startup Order

When the backend runs with `npm run dev`, the execution order is:

1. `src/server.ts` is executed by `tsx`.
2. Imported modules are loaded:
   - `src/app/app.ts`
   - `src/config/env.ts`
   - `src/db/connect.ts`
   - `src/realtime/socket/server.ts`
   - all route modules imported by `createApp`
   - models/services/controllers/middlewares imported by those routes
3. `env.ts` calls `dotenv.config()` and creates the typed `env` object.
4. `bootstrap()` in `server.ts` starts.
5. `connectDB()` connects Mongoose to MongoDB.
6. `createApp()` creates and configures the Express app.
7. `http.createServer(app)` wraps Express in a Node HTTP server.
8. `setupSocket(server)` attaches Socket.IO to the same HTTP server.
9. `server.listen(env.port)` starts accepting HTTP and WebSocket traffic.

After step 9, no controller code runs until a client sends an HTTP request or opens a Socket.IO connection.

## 3. Request Lifecycle

Every HTTP request follows this general path:

```txt
Client
  -> Node HTTP server
  -> Express app from createApp()
  -> global middleware
  -> mounted route group
  -> route-level middleware
  -> controller
  -> service/model utilities
  -> response helper or error handler
```

The global middleware order in `src/app/app.ts` is important:

1. `helmet()` sets security headers.
2. `cors(...)` allows the configured frontend origin and credentials.
3. `cookieParser()` parses cookies into `req.cookies`.
4. `express.json(...)` parses JSON request bodies.
5. `express.urlencoded(...)` parses URL-encoded bodies.
6. `csrfProtection` validates CSRF tokens for unsafe cookie-auth requests.
7. `morgan("dev")` logs the HTTP request.
8. `rateLimit(...)` applies the general API rate limit.
9. `express.static(...)` serves uploaded files from `/uploads`.
10. Route groups are mounted.
11. `notFoundHandler` handles unmatched routes.
12. `errorHandler` formats errors.

## 4. Mounted Route Order

`src/app/app.ts` mounts routes in this order:

```txt
GET /api/health
/api/auth
/api/audit-logs
/api/users
/api/projects
/api/notifications
/api/upload
/api/pentest
/api/devops
/api/tickets
/api/qa
notFoundHandler
errorHandler
```

Routes are checked in the order they are mounted. The error handler is mounted last because it receives errors passed with `next(error)`.

## 5. Important Request Flows

### 5.1 Register

```txt
POST /api/auth/register
  -> csrfProtection skips because register is public
  -> auth.routes.ts
  -> validate(registerSchema)
  -> register controller
  -> registerUser service
  -> UserModel creates user
  -> issueSessionTokens creates access token and refresh session
  -> setAuthCookies writes accessToken and refreshToken cookies
  -> createCsrfToken writes csrfSecret cookie and returns csrfToken
  -> writeAuditLog stores auth.register event
  -> sendSuccess returns { success: true, data: { user, csrfToken } }
```

### 5.2 Login

```txt
POST /api/auth/login
  -> csrfProtection skips because login is public
  -> validate(loginSchema)
  -> login controller
  -> loginUser service
  -> UserModel finds user with passwordHash selected
  -> bcrypt.compare validates password
  -> issueSessionTokens creates access token and refresh session
  -> cookies and CSRF token are sent
  -> audit log is written
  -> standardized success response is returned
```

### 5.3 Authenticated API Request

```txt
GET /api/projects
  -> csrfProtection skips because GET is safe
  -> project.routes.ts
  -> requireAuth
  -> getAuthUserFromAccessToken
  -> verifyAccessToken
  -> UserModel reloads live user from MongoDB
  -> sessionVersion is checked
  -> req.user is populated
  -> requirePermission(PERMISSIONS.PROJECTS_READ)
  -> getProjects controller
  -> ProjectModel query is scoped by role/user
  -> sendSuccess returns data
```

### 5.4 Unsafe Authenticated API Request With CSRF

```txt
POST /api/projects
  -> cookieParser and body parser run
  -> csrfProtection checks:
       accessToken or refreshToken cookie exists
       method is not GET/HEAD/OPTIONS
       route is not public login/register
       x-csrf-token or body.csrfToken matches signed csrfSecret cookie
  -> route-level auth and permission middleware run
  -> controller runs
```

### 5.5 Refresh Token Rotation

```txt
POST /api/auth/refresh-token
  -> csrfProtection requires a valid CSRF token if auth cookies exist
  -> refreshToken controller
  -> refreshAuthSession(refreshToken cookie)
  -> verifyRefreshToken reads user id, sessionVersion, tokenId
  -> UserModel reloads live user
  -> AuthSessionModel finds the hashed refresh token session
  -> if missing/revoked/expired, active sessions for that user are revoked
  -> issueSessionTokens creates a new refresh token and DB session
  -> old session is marked revoked and linked to new tokenId
  -> new cookies and csrfToken are returned
```

### 5.6 Project-Scoped Operation

Example:

```txt
POST /api/pentest/vulnerabilities
  -> requireAuth
  -> requirePermission(PERMISSIONS.PENTEST_VULNERABILITIES_CREATE)
  -> requireProjectAccess("body.projectId")
  -> ProjectModel verifies project exists
  -> canAccessProject allows admin, project owner, or assigned user
  -> req.project is attached
  -> createVulnerability controller creates item
  -> notification and audit log are written
```

### 5.7 Socket.IO Connection

```txt
Browser opens Socket.IO connection
  -> setupSocket middleware reads Cookie header
  -> cookie.parse extracts accessToken
  -> getAuthUserFromAccessToken verifies token and reloads live user
  -> socket.data.user is populated
  -> connection handler joins rooms:
       user:{userId}
       role:{roleName}
       project:{projectId}
  -> socket:connected event is emitted
```

Notifications use the realtime delivery helper to emit `notification:new` only to
the target user's private room. Project rooms carry non-private project events.

## 6. API Response Contract

All successful API responses should go through `src/utils/response.ts`.

Data responses:

```json
{
  "success": true,
  "data": {}
}
```

Message responses:

```json
{
  "success": true,
  "message": "Logged out"
}
```

Errors are formatted by `src/middlewares/error.middleware.ts`:

```json
{
  "success": false,
  "error": {
    "message": "Unauthorized"
  }
}
```

## 7. File-by-File Execution Guide

### 7.1 Root Runtime Files

#### `src/server.ts`

Purpose: Main API server entrypoint.

When it runs: Immediately when `npm run dev` or the compiled server starts.

What it does:

- Imports the app factory, env config, database connector, and Socket.IO setup.
- Defines `bootstrap()`.
- Calls `connectDB()` before creating the HTTP server.
- Calls `createApp()` to build the Express application.
- Wraps Express with `http.createServer(app)`.
- Calls `setupSocket(server)` so HTTP and Socket.IO share the same server.
- Starts listening on `env.port`.
- Catches startup errors and exits the process.

Why it exists: It is the orchestration file that starts infrastructure in the correct order: database first, app second, socket third, network listener last.

#### `src/app/app.ts`

Purpose: Express application factory.

When it runs: Imported during startup; `createApp()` executes inside `bootstrap()`.

What it does:

- Creates an Express app.
- Registers global middleware in a strict order.
- Mounts static uploads.
- Defines `/api/health`.
- Mounts all feature route groups.
- Mounts not-found and error handlers last.

Why it exists: It keeps HTTP middleware and route registration separate from low-level server startup.

### 7.2 Configuration and Database

#### `src/config/env.ts`

Purpose: Central environment configuration.

When it runs: As soon as any file imports `env`.

What it does:

- Calls `dotenv.config()`.
- Reads `process.env`.
- Provides defaults for local development.
- Exports `env` and `isProduction`.

Why it exists: The rest of the app should not read raw environment variables directly.

#### `src/db/connect.ts`

Purpose: MongoDB connection helper.

When it runs: `connectDB()` runs during `bootstrap()` and during seed execution.

What it does:

- Enables Mongoose `strictQuery`.
- Connects to `env.mongoUri`.
- Logs successful connection.

Why it exists: It centralizes database connection behavior.

#### `src/db/seed.ts`

Purpose: Database seed script.

When it runs: Only when `npm run seed` is executed.

What it does:

- Connects to MongoDB.
- Hashes the default admin password.
- Upserts `admin@example.com`.
- Assigns the admin role.
- Exits the process.

Why it exists: It creates a predictable initial admin account for local/dev environments.

### 7.3 Constants

Constants are loaded during import time and do not perform side effects.

#### `src/constants/routes.ts`

Purpose: Central route and frontend path constants.

Used by: `app.ts`, route files, CSRF middleware, notifications, upload paths.

Why it exists: Prevents route string drift across app mounting, route declarations, and frontend action URLs.

#### `src/constants/http.ts`

Purpose: HTTP status and method constants.

Used by: controllers, middleware, response helpers, CSRF middleware.

Why it exists: Keeps status codes and method names type-safe and readable.

#### `src/constants/security.ts`

Purpose: Cookie names, security header names, and request body security field names.

Used by: cookie utilities, auth middleware, CSRF middleware, socket auth.

Why it exists: A typo in cookie/header names can break authentication or CSRF protection.

#### `src/constants/socket.ts`

Purpose: Socket event names and room builders.

Used by: Socket.IO server and notification service.

Why it exists: Keeps event and room names consistent between join and emit logic.

#### `src/constants/roles.ts`

Purpose: Defines role string constants and the `Role` union type.

Used by: user model, role-permission mapping, project access checks, seed script.

Why it exists: The application should not compare role strings manually.

#### `src/constants/permissions.ts`

Purpose: Defines all permission string constants and the `Permission` union type.

Used by: route authorization, role-permission mapping, frontend dashboard access decisions.

Why it exists: Permissions are the core authorization contract.

#### `src/constants/rolePermissions.ts`

Purpose: Maps roles to permissions.

When it runs: Imported by role services when default role permissions are needed.

What it does:

- Exports `ROLE_PERMISSIONS`.
- Exports `getPermissionsFromRoles()`.
- Admin receives all permissions via `Object.values(PERMISSIONS)`.

Why it exists: It defines the default permission set for each role.

#### `src/constants/projects.ts`

Purpose: Project types and project statuses.

Used by: project model and project validator.

Why it exists: Keeps Mongoose enum values and Zod validation values aligned.

#### `src/constants/vulnerabilities.ts`

Purpose: Vulnerability severity and status constants.

Used by: vulnerability model and pentest controller.

Why it exists: Keeps severity/status values consistent across storage and logic.

#### `src/constants/notifications.ts`

Purpose: Notification type and priority constants.

Used by: notification model, notification service, project and pentest controllers.

Why it exists: Notification protocol values should be stable and type-safe.

#### `src/constants/audit.ts`

Purpose: Audit action and entity type constants.

Used by: controllers and audit service.

Why it exists: Audit logs are only useful if action names are consistent.

#### `src/constants/uploads.ts`

Purpose: Upload field names, size limits, MIME prefix, and public upload path builder.

Used by: upload routes and upload controller.

Why it exists: Centralizes upload limits and generated public file paths.

### 7.4 Utility Files

#### `src/utils/AppError.ts`

Purpose: Operational application error class.

When it runs: Instantiated in middleware/services/controllers when a controlled error should be returned.

What it does:

- Stores `statusCode`.
- Marks the error as operational.
- Defaults to HTTP 500 if no status is provided.

Why it exists: `errorHandler` can distinguish expected application errors from unknown internal errors.

#### `src/utils/response.ts`

Purpose: Standard success response helper.

When it runs: Controllers and route handlers call `sendSuccess()` or `sendMessage()`.

What it does:

- Returns `{ success: true, data }`.
- Returns `{ success: true, message }`.
- Applies the requested HTTP status code.

Why it exists: The frontend receives a consistent API response shape.

#### `src/utils/cookies.ts`

Purpose: Cookie read/write behavior for auth and CSRF cookies.

When it runs: Controllers and middleware call its functions.

What it does:

- Defines base cookie options.
- Sets `accessToken` and `refreshToken`.
- Sets and clears `csrfSecret`.
- Clears auth cookies during logout/auth failure.

Why it exists: Cookie options must stay consistent between set and clear operations.

#### `src/utils/jwt.ts`

Purpose: JWT signing and verification.

When it runs: Auth/session services call it.

What it does:

- Defines access-token payload shape.
- Defines refresh-token payload shape with `tokenId`.
- Signs access tokens.
- Signs refresh tokens.
- Verifies access and refresh tokens.

Why it exists: JWT behavior is isolated from business logic.

### 7.5 Type Declarations

#### `src/types/express.d.ts`

Purpose: Extends Express request types.

When it runs: TypeScript uses it at compile time.

What it adds:

- `Express.UserContext`.
- `req.user`.
- `req.project`.

Why it exists: Middleware can attach authenticated user and project data safely.

#### `src/types/cookie.d.ts`

Purpose: Declares the `cookie` module shape for TypeScript.

When it runs: Compile time only.

Why it exists: Ensures `cookie.parse()` is typed.

### 7.6 Middleware

#### `src/middlewares/auth.middleware.ts`

Purpose: Authenticates protected HTTP routes.

When it runs: Route files call `router.use(requireAuth)` or attach it to specific routes.

What it does:

- Reads `accessToken` cookie.
- Verifies it and reloads the live user from MongoDB.
- If no access token exists, uses the refresh token to rotate and issue fresh cookies.
- Sets `req.user`.
- Clears auth cookies and returns unauthorized on failure.

Why it exists: Protected controllers should receive a real, live, current user context.

#### `src/middlewares/csrf.middleware.ts`

Purpose: Protects cookie-auth unsafe requests from CSRF.

When it runs: Globally in `app.ts` before routes.

What it does:

- Allows safe methods: GET, HEAD, OPTIONS.
- Allows public login/register.
- Requires CSRF validation for unsafe requests when auth cookies exist.
- Uses an httpOnly `csrfSecret` cookie and a client-sent `x-csrf-token` header.
- Uses timing-safe token comparison.
- Provides `GET /api/auth/csrf-token` handler support.

Why it exists: Browser cookies are sent automatically, so unsafe cookie-auth requests need a separate CSRF proof.

#### `src/middlewares/permission.middleware.ts`

Purpose: Checks permissions after authentication.

When it runs: Route files call `requirePermission(...)`.

What it does:

- Reads `req.user.permissions`.
- Ensures every required permission is present.
- Returns forbidden if not allowed.

Why it exists: Authentication proves who the user is; permissions decide what they can do.

#### `src/middlewares/projectAccess.middleware.ts`

Purpose: Enforces project-level access.

When it runs: Routes that operate on a specific project call `requireProjectAccess(...)`.

What it does:

- Reads project id from `params.id` or `body.projectId`.
- Loads the project.
- Allows admin, project owner, or assigned user.
- Attaches `req.project`.
- Provides `getAccessibleProjectIds()` for filtered list queries.

Why it exists: Permission alone is not enough; users must only access their own assigned project resources.

#### `src/middlewares/validate.middleware.ts`

Purpose: Runs Zod validation for route input.

When it runs: Route files call `validate(schema)` before controllers.

What it does:

- Validates `{ body, params, query }`.
- On failure, forwards a 400 error.
- On success, calls `next()`.

Why it exists: Controllers should receive validated request shapes.

#### `src/middlewares/error.middleware.ts`

Purpose: Final not-found and error formatting layer.

When it runs: At the end of the middleware chain.

What it does:

- `notFoundHandler` throws a 404 `AppError`.
- `errorHandler` converts errors into `{ success: false, error: { message, statusCode } }`.
- Hides unknown internal error messages.

Why it exists: Keeps error responses consistent.

### 7.7 Audit Module

#### `src/modules/audit/models/auditLog.model.ts`

Purpose: MongoDB schema/model for audit logs.

When it runs: Imported by audit service and audit controller.

What it stores:

- Actor user id.
- Action name.
- Entity type and id.
- IP and user agent.
- Optional metadata.
- Timestamps.

Why it exists: Enterprise systems need traceability for important actions.

#### `src/modules/audit/services/audit.service.ts`

Purpose: Safe audit log writer.

When it runs: Controllers call `writeAuditLog()`.

What it does:

- Creates an audit log record.
- Pulls actor, IP, and user agent from `req` when available.
- Catches and logs audit write failures instead of breaking the user request.

Why it exists: Audit logging should be reliable but should not make normal business actions fail if logging has a temporary issue.

#### `src/modules/audit/controllers/audit.controller.ts`

Purpose: Returns recent audit logs.

When it runs: `GET /api/audit-logs`.

What it does:

- Reads latest 200 audit logs.
- Maps Mongo documents to API response objects.
- Returns standardized success response.

Why it exists: Admins need visibility into system activity.

#### `src/modules/audit/routes/audit.routes.ts`

Purpose: Defines audit API routes.

When it runs: Mounted by `app.ts` at `/api/audit-logs`.

Route flow:

```txt
router.use(requireAuth)
GET / -> requirePermission(AUDIT_LOGS_READ) -> getAuditLogs
```

Why it exists: Keeps audit endpoints isolated from other modules.

### 7.8 Auth Module

#### `src/modules/auth/models/authSession.model.ts`

Purpose: Stores refresh-token sessions.

When it runs: Used by session service.

What it stores:

- User id.
- Token id.
- Hashed refresh token.
- Session version.
- IP and user agent.
- Expiration.
- Revocation and replacement data.

Why it exists: Refresh tokens must be revocable and rotated securely.

#### `src/modules/auth/validators/auth.validators.ts`

Purpose: Zod schemas for auth routes.

When it runs: `validate(...)` middleware uses these before auth controllers.

Schemas:

- `loginSchema`: email and password.
- `registerSchema`: name, email, password, optional avatar URL.

Why it exists: Prevents invalid auth input from reaching business logic.

#### `src/modules/auth/services/auth.service.ts`

Purpose: Business logic for registration and login.

When it runs: Auth controller calls `registerUser()` or `loginUser()`.

What it does:

- Checks duplicate email on register.
- Hashes passwords with bcrypt.
- Validates login password.
- Converts user to auth JSON.
- Issues access and refresh tokens through session service.

Why it exists: Controllers should coordinate HTTP concerns; this service owns auth business rules.

#### `src/modules/auth/services/session.service.ts`

Purpose: Session validation, refresh-token rotation, and live user loading.

When it runs:

- During login/register to issue tokens.
- During protected requests to verify access tokens.
- During refresh-token endpoint to rotate refresh tokens.
- During logout to revoke a refresh session.

Important functions:

- `issueSessionTokens()`: creates access token, refresh token, and DB session record.
- `getAuthUserFromAccessToken()`: verifies access token and reloads current user.
- `refreshAuthSession()`: verifies refresh token, checks DB session, rotates token, revokes old session.
- `revokeRefreshSession()`: revokes one refresh-token session.

Why it exists: All token/session rules live in one place.

#### `src/modules/auth/controllers/auth.controller.ts`

Purpose: HTTP handlers for auth routes.

When it runs: Auth routes call these handlers.

Handlers:

- `register`: creates user, sets cookies, creates CSRF token, writes audit log.
- `login`: validates credentials, sets cookies, creates CSRF token, writes audit log.
- `me`: returns current live user.
- `refreshToken`: rotates refresh token, sets new cookies, returns new CSRF token.
- `logout`: revokes refresh session, clears cookies, writes audit log.

Why it exists: It connects HTTP requests to auth services, cookies, CSRF, responses, and audit logs.

#### `src/modules/auth/routes/auth.routes.ts`

Purpose: Defines auth endpoints.

When it runs: Mounted by `app.ts` at `/api/auth`.

Routes:

```txt
POST /register       -> validate(registerSchema) -> register
POST /login          -> validate(loginSchema) -> login
GET  /csrf-token     -> csrfTokenHandler
GET  /me             -> requireAuth -> me
POST /refresh-token  -> refreshToken
POST /logout         -> logout
```

Why it exists: Keeps auth route definitions separate from controller logic.

### 7.9 Users Module

#### `src/modules/users/models/user.model.ts`

Purpose: User MongoDB schema/model.

When it runs: Imported by auth, users, seed, and session logic.

Important fields:

- `passwordHash` is `select: false` by default.
- `roles` defaults to pentester.
- `projectIds` stores assigned projects.
- `sessionVersion` invalidates old tokens when incremented.
- `isActive` disables users.

Related permission storage:

- `RoleModel.permissions` stores baseline permissions for each role.
- `UserPermissionModel.permissions` stores the effective permission list for each user.
- `toAuthUserContext()` returns safe auth context with effective permissions.

Why it exists: User identity, role assignment, project assignment, and session invalidation are centered here.

#### `src/modules/users/controllers/user.controller.ts`

Purpose: User management handlers.

Handlers:

- `getUsers`: returns users as auth-safe JSON.
- `createUser`: hashes password, creates user, writes audit log.
- `updateUserRolesPermissions`: updates roles and permissions, increments `sessionVersion`, writes audit log.

Why it exists: Admin user management lives here.

#### `src/modules/users/routes/user.routes.ts`

Purpose: Defines user management routes.

When it runs: Mounted at `/api/users`.

Route flow:

```txt
router.use(requireAuth)
GET   /                       -> requirePermission(USERS_READ)   -> getUsers
POST  /                       -> requirePermission(USERS_CREATE) -> createUser
PATCH /:id/roles-permissions  -> requirePermission(USERS_UPDATE) -> updateUserRolesPermissions
```

Why it exists: Protects user operations with auth and permission checks.

### 7.10 Projects Module

#### `src/modules/projects/models/project.model.ts`

Purpose: Project MongoDB schema/model.

Fields:

- `name`
- `type`
- `description`
- `status`
- `ownerId`
- `assignedUserIds`

Why it exists: Projects are the ownership/assignment boundary for several modules.

#### `src/modules/projects/validators/project.validators.ts`

Purpose: Zod schemas for project creation and assignment.

Schemas:

- `createProjectSchema`: validates name, type, description.
- `assignUsersSchema`: validates non-empty `userIds`.

Why it exists: Project controllers should only run after valid input.

#### `src/modules/projects/controllers/project.controller.ts`

Purpose: Project management handlers.

Handlers:

- `getProjects`: admin sees all; non-admin sees owned/assigned projects.
- `createProject`: creates a project owned by current user and writes audit log.
- `assignUsersToProject`: adds users to project, updates users' projectIds, sends notifications, writes audit log.

Why it exists: Owns project CRUD/assignment business behavior.

#### `src/modules/projects/routes/project.routes.ts`

Purpose: Defines project routes.

Route flow:

```txt
router.use(requireAuth)
GET  /                  -> requirePermission(PROJECTS_READ) -> getProjects
POST /                  -> requirePermission(PROJECTS_CREATE) -> validate(createProjectSchema) -> createProject
POST /:id/assign-users  -> requireProjectAccess("params.id") -> requirePermission(PROJECTS_ASSIGN_USERS) -> validate(assignUsersSchema) -> assignUsersToProject
```

Why it exists: Combines authentication, permission checks, project access checks, validation, and controllers.

### 7.11 Notifications Module

#### `src/modules/notifications/models/notification.model.ts`

Purpose: Notification MongoDB schema/model.

Fields:

- `userId`
- `projectId`
- `type`
- `title`
- `message`
- `priority`
- `isRead`
- `actionUrl`
- `entityId`

Why it exists: Stores notifications for later retrieval and real-time delivery.

#### `src/modules/notifications/services/notification.service.ts`

Purpose: Create persistent notifications and emit real-time events.

When it runs: Project and pentest controllers call `createNotification()`.

What it does:

- Creates a notification document.
- Builds a response/event payload.
- Emits `notification:new` to `user:{id}`.
- Emits private notifications only to `user:{id}`.

Why it exists: Notification persistence and Socket.IO delivery should happen together.

#### `src/modules/notifications/controllers/notification.controller.ts`

Purpose: Notification HTTP handlers.

Handlers:

- `getNotifications`: returns latest 50 notifications for current user.
- `markAsRead`: marks one notification as read and writes audit log.
- `markAllAsRead`: marks all current user's notifications as read and writes audit log.

Why it exists: Provides user-facing notification API.

#### `src/modules/notifications/routes/notification.routes.ts`

Purpose: Defines notification endpoints.

Route flow:

```txt
router.use(requireAuth)
GET   /              -> getNotifications
PATCH /read-all      -> markAllAsRead
PATCH /:id/read      -> markAsRead
```

Why it exists: All notification endpoints require an authenticated user.

### 7.12 Pentest Module

#### `src/modules/pentest/models/vulnerability.model.ts`

Purpose: Vulnerability MongoDB schema/model.

Fields:

- `projectId`
- `title`
- `severity`
- `description`
- `status`
- `createdBy`

Why it exists: Stores security findings submitted by pentest users.

#### `src/modules/pentest/controllers/pentest.controller.ts`

Purpose: Vulnerability handlers.

Handlers:

- `getVulnerabilities`: filters by projects accessible to current user.
- `createVulnerability`: creates a vulnerability in an accessible project, sends notification, writes audit log.

Why it exists: Owns pentest-specific business behavior.

#### `src/modules/pentest/routes/pentest.routes.ts`

Purpose: Defines pentest routes.

Route flow:

```txt
router.use(requireAuth)
GET  /vulnerabilities -> requirePermission(VULNERABILITIES_READ) -> getVulnerabilities
POST /vulnerabilities -> requirePermission(VULNERABILITIES_CREATE) -> requireProjectAccess("body.projectId") -> createVulnerability
```

Why it exists: Ensures vulnerability operations require both permission and project access.

### 7.13 Uploads Module

#### `src/modules/uploads/routes/upload.routes.ts`

Purpose: Defines avatar upload route and Multer storage.

When it runs: Imported at startup; route executes on upload requests.

What it does at import time:

- Resolves upload directory.
- Creates upload directory if missing.
- Configures Multer disk storage.
- Configures file size limit and image-only filter.

Route:

```txt
POST /avatar -> upload.single("file") -> uploadAvatar
```

Why it exists: Keeps file handling configuration close to upload route declaration.

#### `src/modules/uploads/controllers/upload.controller.ts`

Purpose: Upload response handler.

When it runs: After Multer successfully stores the file.

What it does:

- Builds the public uploaded file URL.
- Writes audit log.
- Returns standardized success response.

Why it exists: Separates storage middleware from response/audit behavior.

### 7.14 Audit-Adjacent Stub Modules

These modules currently expose placeholder data but already use enterprise auth, permissions, constants, and response shape.

#### `src/modules/devops/routes/devops.routes.ts`

Purpose: DevOps route placeholders.

Routes:

```txt
GET  /deployments -> DEPLOYMENTS_READ
POST /deployments -> DEPLOYMENTS_CREATE
GET  /servers     -> SERVERS_READ
```

Why it exists: Reserves API structure for future DevOps features.

#### `src/modules/qa/routes/qa.routes.ts`

Purpose: QA route placeholders.

Routes:

```txt
GET   /test-cases            -> QA_TEST_CASES_READ
POST  /test-cases            -> QA_TEST_CASES_CREATE
PATCH /test-cases/:id/status -> QA_TEST_CASES_UPDATE
```

Why it exists: Reserves API structure for future QA workflows.

#### `src/modules/tickets/routes/ticket.routes.ts`

Purpose: Ticket route placeholders.

Routes:

```txt
GET   /
POST  /
PATCH /:id/status
```

Why it exists: Reserves API structure for support/representative workflows.

### 7.15 Realtime Socket Layer

#### `src/realtime/socket/server.ts`

Purpose: Socket.IO server setup and global accessor.

When it runs:

- `setupSocket(server)` runs during startup.
- Socket middleware runs on every socket connection.
- `getIO()` runs whenever services need to emit events.

What it does:

- Creates Socket.IO server with CORS credentials enabled.
- Authenticates socket connections using the `accessToken` cookie.
- Reloads live user via `getAuthUserFromAccessToken()`.
- Joins user, role, and project rooms.
- Emits `socket:connected`.
- Uses reusable delivery and room-management helpers.
- Uses the Redis adapter when `SOCKET_REDIS_URL` or `REDIS_URL` is configured.
- Stores the initialized `io` instance for later use.

Why it exists: Keeps realtime notification transport separate from HTTP controllers.

## 8. Execution Timing Categories

Files in this backend run in four different ways:

### Startup-time files

These execute during server boot:

```txt
src/server.ts
src/config/env.ts
src/app/app.ts
src/db/connect.ts
src/realtime/socket/server.ts
all imported route/model/service/constant files
```

### Request-time files

These execute when an HTTP request matches a route:

```txt
middlewares/*
modules/*/routes/*
modules/*/controllers/*
modules/*/services/*
utils/response.ts
utils/cookies.ts
utils/jwt.ts
```

### Database model definition files

These are imported at startup or request time and register Mongoose models:

```txt
modules/*/models/*.ts
```

Model definitions run once per Node process. Queries run later when controllers/services call the model.

### Compile-time-only files

These affect TypeScript only:

```txt
src/types/express.d.ts
src/types/cookie.d.ts
```

## 9. How To Add A New Feature Safely

When adding a new module, follow this order:

1. Add constants if the feature introduces protocol strings, statuses, types, or routes.
2. Add a model if the feature persists data.
3. Add validators for incoming request bodies.
4. Add services for business logic.
5. Add controllers for HTTP coordination.
6. Add routes with `requireAuth`, `requirePermission`, `requireProjectAccess`, and `validate` as needed.
7. Mount the route in `src/app/app.ts`.
8. Use `sendSuccess` or `sendMessage` for responses.
9. Use `writeAuditLog` for important state changes.
10. Run `npm run typecheck`.

## 10. Debugging Execution Problems

Use this checklist when something does not run:

1. Is the route mounted in `src/app/app.ts`?
2. Is the path constant correct in `src/constants/routes.ts`?
3. Does global CSRF middleware block the request?
4. Does the route require `requireAuth`?
5. Does the user have the required permission?
6. If project-scoped, does the user own or have assignment to the project?
7. Does validation reject the request before the controller?
8. Does the controller call the expected service/model?
9. Does the service write/read the expected MongoDB model?
10. Does the error handler hide the real error because it is not an `AppError`?

## 11. Quick Flow Map

```txt
server.ts
  -> connectDB()
  -> createApp()
       -> global middleware
       -> route mounting
       -> error handling
  -> setupSocket()
  -> listen()

HTTP request
  -> global middleware
  -> route middleware
  -> controller
  -> service/model
  -> audit/notification/socket if needed
  -> response helper

Socket connection
  -> cookie accessToken
  -> live user reload
  -> room joins
  -> realtime events
```

This is the core execution hierarchy of the backend.
