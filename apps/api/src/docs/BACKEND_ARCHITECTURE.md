# Enterprise Dashboard Backend Architecture

This backend is designed for the React enterprise dashboard frontend. It uses Node.js, Express.js, MongoDB, Mongoose, Socket.IO, cookie-based authentication and permission-based authorization.

## Main Stack

- Node.js
- Express.js
- TypeScript
- MongoDB + Mongoose
- Socket.IO
- HttpOnly cookie authentication
- JWT access/refresh tokens
- Role-based and permission-based authorization
- RTK Query-compatible API responses
- Real-time notifications
- File upload with Multer

## Folder Structure

```txt
src/
├── app/                 Express app setup
├── config/              Environment config
├── constants/           Roles, permissions, role-permission mapping
├── db/                  MongoDB connection and seed
├── middlewares/         Auth, permission, validation, error handlers
├── modules/             Feature modules
│   ├── auth/
│   ├── audit/
│   ├── users/
│   ├── projects/
│   ├── notifications/
│   ├── pentest/
│   ├── devops/
│   ├── tickets/
│   ├── qa/
│   └── uploads/
├── realtime/            Socket.IO server
├── types/               Global types
└── utils/               JWT, cookies, AppError
```

## Authentication Flow

Frontend sends:

```http
POST /api/auth/login
```

Backend validates the user and sets cookies:

```http
Set-Cookie: accessToken=...; HttpOnly
Set-Cookie: refreshToken=...; HttpOnly
Set-Cookie: csrfSecret=...; HttpOnly
```

The frontend does not store tokens. The browser sends cookies automatically because the frontend RTK Query config must use:

```ts
credentials: "include"
```

Login and register responses include a `csrfToken`. The frontend must send this value on unsafe requests that use auth cookies:

```http
x-csrf-token: <csrfToken>
```

If the app reloads and loses the in-memory token, fetch a fresh one:

```http
GET /api/auth/csrf-token
```

Refresh tokens are persisted as hashed session records and rotated on every `POST /api/auth/refresh-token`. The previous refresh token is revoked after a successful rotation. Reusing a missing, expired or revoked refresh token revokes the user's active refresh sessions.

## API Response Shape

Successful responses use:

```json
{
  "success": true,
  "data": {}
}
```

Message-only success responses use:

```json
{
  "success": true,
  "message": "Logged out"
}
```

Errors use:

```json
{
  "success": false,
  "error": {
    "message": "Unauthorized"
  }
}
```

## Authorization

Permissions are defined in:

```txt
src/constants/permissions.ts
```

Role-to-permission mapping is defined in:

```txt
src/constants/rolePermissions.ts
```

Protected API routes use:

```ts
requireAuth
requirePermission(PERMISSIONS.ADMIN_PROJECTS_CREATE)
requireProjectAccess("params.id")
```

Every access/refresh token includes the user's `id` and `sessionVersion`. `requireAuth` reloads the current user from MongoDB on each request, checks the token's `sessionVersion`, and then uses the live roles, permissions and project assignments for authorization. Updating a user's roles or permissions increments `sessionVersion`, which invalidates their old tokens.

Frontend dashboard routing should use `GET /api/auth/me` and check the returned permissions, for example `admin.dashboard.read` for the admin dashboard or `pentest.dashboard.read` for the pentest dashboard.

Only admin can create projects because `PROJECTS_CREATE` is included for admin only.

Project-owned resources should use `requireProjectAccess` so non-admin users can only operate on projects they own or are assigned to. Vulnerability creation and project assignment already use this middleware.

## Audit Logs

Security-relevant actions are written to MongoDB via `AuditLogModel`, including auth events, user changes, project assignment, vulnerability creation, notification read changes and avatar uploads.

Admins can read recent audit logs with:

```txt
GET /api/audit-logs
```

## Project Managers

This backend includes two project manager roles:

```txt
project_manager_security
project_manager_qa
```

Security project manager permissions include:

```txt
projects.manage.security
projects.assign_users
vulnerabilities.read
reports.export
```

QA project manager permissions include:

```txt
projects.manage.qa
projects.assign_users
qa.testcases.read
qa.testcases.update
```

## Notifications

Notifications are persistent and real-time.

Persistent storage:

```txt
NotificationModel in MongoDB
```

Real-time delivery:

```txt
Socket.IO event: notification:new
```

Socket rooms:

```txt
user:{userId}
role:{roleName}
project:{projectId}
```

When a user is assigned to a project, backend:

1. updates project assigned users
2. updates user's projectIds
3. creates a notification in MongoDB
4. emits `notification:new` via Socket.IO

## API Endpoints

Auth:

```txt
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/csrf-token
GET  /api/auth/me
POST /api/auth/refresh-token
POST /api/auth/logout
```

Projects:

```txt
GET  /api/projects
POST /api/projects
POST /api/projects/:id/assign-users
```

Notifications:

```txt
GET   /api/notifications
PATCH /api/notifications/:id/read
PATCH /api/notifications/read-all
```

Users:

```txt
GET   /api/users
POST  /api/users
PUT   /api/users/:userId
PATCH /api/users/:id/roles-permissions
```

Audit:

```txt
GET /api/audit-logs
```

Uploads:

```txt
POST /api/upload/avatar
```

## Run Project

```bash
npm install
cp .env.example .env
npm run dev
```

Seed admin user:

```bash
npm run seed
```

Default admin:

```txt
email: admin@example.com
password: 12345678
```

## Frontend Environment

The React frontend should use:

```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

## Production Notes

For production:

- Use HTTPS
- Set strong JWT secrets
- Set a strong CSRF_SECRET
- Set Secure cookies
- Use SameSite=None only when cross-site is needed
- Add Redis adapter for Socket.IO when scaling to multiple server instances
- Add job queue for email/SMS/push notifications
