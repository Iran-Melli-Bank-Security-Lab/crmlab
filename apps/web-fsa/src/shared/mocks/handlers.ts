import { http, HttpResponse } from "msw";
import { ROLES } from "@/entities/permission/model/roles";
import { ALL_PERMISSIONS, PERMISSIONS } from "@/entities/permission/model/permissions";
import {
  getMockPermissionsFromRoles,
  markAllMockNotificationsRead,
  markMockNotificationRead,
  mockNotifications,
  mockRoleCatalog,
  mockUsers,
  upsertMockUser,
} from "@/shared/mocks/data";
import { mockProjects } from "@/shared/mocks/projects";
import type { User } from "@/shared/types";
import type { CreateProjectRequest } from "@/shared/types/api/projects";

const apiUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";
const endpoint = (path: string) => `${apiUrl}${path}`;
let authenticatedUserId = mockUsers[0]?.id;

function toApiProject(project: (typeof mockProjects)[number]) {
  return {
    id: project.id,
    _id: project.id,
    projectName: project.name,
    projectGroupId: project.projectGroupId,
    canonicalName: project.canonicalName,
    version: project.version,
    letterNumber: project.letterNumber,
    type: project.discipline === "platform" ? "devops" : project.discipline,
    platform: project.platform,
    status: project.status,
    ownerId: project.createdByUserId,
    projectManager: project.securityManagerId,
    qualityManager: project.qualityManagerId,
    devops: project.devopsAssigneeId,
    representative: project.representativeId,
    assignedUserIds: project.assignedUserIds,
    testExpiresAt: project.testExpiresAt || project.dueDate,
    createdAt: project.createdAt,
    updatedAt: project.lastActivity,
    devopsInfo: project.devopsInfo || {
      environment: project.environment,
      repository: project.repository,
      pipeline: project.pipeline,
    },
  };
}

export const handlers = [
  http.post(endpoint("/auth/login"), async ({ request }) => {
    const body = (await request.json()) as { username?: string; password?: string };
    if (!body.username || !body.password || body.password.length < 6) {
      return HttpResponse.json(
        { message: "Invalid username or password" },
        { status: 401 }
      );
    }

    const user = mockUsers.find(
      (item) => item.username === body.username || item.name === body.username
    ) ||
      mockUsers[0] || {
        id: "1",
        name: "Admin User",
        firstName: "Admin",
        lastName: "User",
        username: body.username,
        roles: [ROLES.ADMIN],
        permissions: getMockPermissionsFromRoles([ROLES.ADMIN]),
      };

    authenticatedUserId = user.id;
    return HttpResponse.json({ user });
  }),

  http.post(endpoint("/auth/register"), async ({ request }) => {
    const body = (await request.json()) as Partial<User> & {
      firstName?: string;
      lastName?: string;
      username?: string;
      password?: string;
    };
    const roles = body.roles?.length ? body.roles : [ROLES.REPRESENTATIVE];
    const permissions = body.permissions?.length
      ? body.permissions
      : getMockPermissionsFromRoles(roles);
    const user: User = {
      id: crypto.randomUUID(),
      name: `${body.firstName || "New"} ${body.lastName || "User"}`,
      firstName: body.firstName || "New",
      lastName: body.lastName || "User",
      username: body.username || "new.user",
      roles,
      permissions,
      status: "Active",
      avatarUrl: body.avatarUrl,
    };
    upsertMockUser(user);
    authenticatedUserId = user.id;
    return HttpResponse.json({ user }, { status: 201 });
  }),

  http.post(endpoint("/auth/register-admin"), async ({ request }) => {
    const body = (await request.json()) as Partial<User> & {
      firstName?: string;
      lastName?: string;
      username?: string;
      password?: string;
    };
    const roles = [ROLES.ADMIN];
    const user: User = {
      id: crypto.randomUUID(),
      name: `${body.firstName || "Admin"} ${body.lastName || "User"}`,
      firstName: body.firstName || "Admin",
      lastName: body.lastName || "User",
      username: body.username || "admin.user",
      roles,
      permissions: getMockPermissionsFromRoles(roles),
      status: "Active",
      avatarUrl: body.avatarUrl,
    };
    upsertMockUser(user);
    authenticatedUserId = user.id;
    return HttpResponse.json({ user }, { status: 201 });
  }),

  http.post(endpoint("/auth/refresh-token"), async () => {
    return HttpResponse.json({ success: true });
  }),

  http.get(endpoint("/auth/csrf-token"), () => {
    return HttpResponse.json({
      success: true,
      data: {
        csrfToken: "mock-csrf-token",
      },
    });
  }),

  http.get(endpoint("/auth/me"), () => {
    const user = mockUsers.find((item) => item.id === authenticatedUserId);
    return HttpResponse.json(user || mockUsers[0]);
  }),

  http.post(endpoint("/auth/logout"), () => {
    authenticatedUserId = undefined;
    return HttpResponse.json({ success: true });
  }),

  http.get(endpoint("/users"), () => HttpResponse.json(mockUsers)),

  http.get(endpoint("/users/roles"), () =>
    HttpResponse.json({
      success: true,
      data: {
        roles: mockRoleCatalog,
        permissions: Array.from(
          new Set([
            ...ALL_PERMISSIONS,
            ...mockRoleCatalog.flatMap((role) => role.permissions),
          ])
        ),
      },
    })
  ),

  http.put(endpoint("/users/:id"), async ({ params, request }) => {
    const body = (await request.json()) as Partial<User>;
    const existing = mockUsers.find((item) => item.id === params.id);
    if (!existing)
      return HttpResponse.json({ message: "User not found" }, { status: 404 });
    const roles = body.roles || existing.roles;
    const permissions = body.permissions || getMockPermissionsFromRoles(roles);
    const updated = upsertMockUser({ ...existing, ...body, roles, permissions });
    return HttpResponse.json(updated);
  }),

  http.delete(endpoint("/users/:id"), ({ params }) => {
    return HttpResponse.json({ success: true, id: params.id });
  }),

  http.post(endpoint("/upload/avatar"), async () => {
    return HttpResponse.json({
      url: "https://placehold.co/256x256?text=Avatar",
      fileId: crypto.randomUUID(),
    });
  }),

  http.get(endpoint("/projects/:id"), ({ params }) => {
    const project = mockProjects.find((item) => item.id === params.id);
    if (!project) {
      return HttpResponse.json({ message: "Project not found" }, { status: 404 });
    }

    return HttpResponse.json({ data: toApiProject(project) });
  }),

  http.post(endpoint("/projects"), async ({ request }) => {
    const user = mockUsers.find((item) => item.id === authenticatedUserId);
    const isAdmin = user?.roles.includes(ROLES.ADMIN);
    const canCreate = user?.permissions.some(
      (permission) =>
        permission === PERMISSIONS.ADMIN_SYSTEM_MANAGE || permission === PERMISSIONS.ADMIN_PROJECTS_CREATE
    );

    if (!isAdmin || !canCreate) {
      return HttpResponse.json(
        { message: "Project creation is restricted to admins" },
        { status: 403 }
      );
    }

    const body = (await request.json()) as CreateProjectRequest;
    return HttpResponse.json(
      {
        project: {
          ...body,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        },
      },
      { status: 201 }
    );
  }),

  http.get(endpoint("/notifications"), () =>
    HttpResponse.json({ items: mockNotifications })
  ),

  http.patch(endpoint("/notifications/:id/read"), ({ params }) => {
    const notification = markMockNotificationRead(String(params.id));
    if (!notification)
      return HttpResponse.json({ message: "Notification not found" }, { status: 404 });
    return HttpResponse.json(notification);
  }),

  http.patch(endpoint("/notifications/read-all"), () => {
    markAllMockNotificationsRead();
    return HttpResponse.json({ success: true });
  }),

  http.delete(endpoint("/notifications/:id"), () => {
    return HttpResponse.json({ success: true });
  }),

  http.get(endpoint("/pentest/vulnerabilities"), () =>
    HttpResponse.json([{ id: "v1", title: "Stored XSS", severity: "high" }])
  ),
  http.get(endpoint("/devops/deployments"), () =>
    HttpResponse.json([{ id: "d1", service: "api", status: "success" }])
  ),
  http.get(endpoint("/tickets"), () =>
    HttpResponse.json([{ id: "t1", title: "Customer onboarding", status: "open" }])
  ),
  http.get(endpoint("/qa/test-cases"), () =>
    HttpResponse.json([
      { id: "q1", title: "Login validates required fields", status: "passed" },
    ])
  ),
];
