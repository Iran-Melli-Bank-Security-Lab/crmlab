import assert from "node:assert/strict";
import test, { mock } from "node:test";
import { ROLES } from "@/constants/roles";
import { PERMISSIONS } from "@/constants/permissions";
import { normalizeRoles, UserModel } from "../models/user.model";
import { UserPermissionModel } from "../models/userPermission.model";
import { updateUserRolesPermissionsSchema } from "../validators/user.validators";
import { replaceUserRoles, upsertUserPermissions } from "./userAuth.service";
import {
  assertAdminCannotDeactivateSelf,
  assertAdminAccessIsNotGranted,
  protectAdminUserAccess,
} from "./userAccessPolicy.service";

test("the User schema does not store project membership ids", () => {
  assert.equal(UserModel.schema.path("projectIds"), undefined);
});

test("removing one role from a canonical multi-role user persists across refresh", () => {
  const storedUser = {
    roles: [ROLES.PENTESTER],
    devOps: true,
    security: true,
  };

  assert.deepEqual(normalizeRoles(storedUser), [ROLES.PENTESTER]);
  assert.deepEqual(normalizeRoles({ ...storedUser }), [ROLES.PENTESTER]);
});

test("legacy roles are preserved until a canonical update becomes the source of truth", () => {
  const legacyUser = {
    roles: { User: 2001 },
    devOps: true,
  };

  assert.deepEqual(normalizeRoles(legacyUser), [ROLES.REPRESENTATIVE, ROLES.DEVOPS]);
  assert.deepEqual(
    normalizeRoles({ ...legacyUser, roles: [ROLES.REPRESENTATIVE] }),
    [ROLES.REPRESENTATIVE]
  );
});

test("new canonical users do not inherit stale legacy flags", () => {
  assert.deepEqual(
    normalizeRoles({ roles: [ROLES.QA], qualityAssurance: true, devOps: true }),
    [ROLES.QA]
  );
});

test("the last role cannot be removed but a one-role update remains valid", () => {
  const request = (roles: string[]) => ({
    params: { id: "user-1" },
    body: { roles, permissions: [] },
    query: {},
  });

  assert.equal(updateUserRolesPermissionsSchema.safeParse(request([])).success, false);
  assert.equal(
    updateUserRolesPermissionsSchema.safeParse(request([ROLES.PENTESTER])).success,
    true
  );
});

test("role replacement uses $set instead of merging submitted roles", async () => {
  let capturedUpdate: unknown;
  const findByIdAndUpdate = mock.method(
    UserModel,
    "findByIdAndUpdate",
    async (_id: unknown, update: unknown) => {
      capturedUpdate = update;
      return { roles: [ROLES.PENTESTER] } as never;
    }
  );

  await replaceUserRoles("user-1", [ROLES.PENTESTER]);
  findByIdAndUpdate.mock.restore();

  assert.deepEqual(capturedUpdate, {
    $set: { roles: [ROLES.PENTESTER] },
    $inc: { sessionVersion: 1 },
  });
});

test("permission removal replaces the stored list, including an empty list", async () => {
  let capturedUpdate: unknown;
  const findOneAndUpdate = mock.method(
    UserPermissionModel,
    "findOneAndUpdate",
    async (_filter: unknown, update: unknown) => {
      capturedUpdate = update;
      return null;
    }
  );

  const remaining = [PERMISSIONS.PENTEST_DASHBOARD_READ];
  await upsertUserPermissions("user-1", remaining);
  assert.deepEqual(capturedUpdate, {
    $set: { permissions: remaining },
    $setOnInsert: { userId: "user-1" },
  });

  await upsertUserPermissions("user-1", []);
  assert.deepEqual(capturedUpdate, {
    $set: { permissions: [] },
    $setOnInsert: { userId: "user-1" },
  });
  findOneAndUpdate.mock.restore();
});

test("admin access cannot be granted to another user", () => {
  assert.throws(
    () => assertAdminAccessIsNotGranted([ROLES.ADMIN], []),
    (error: unknown) =>
      error instanceof Error &&
      "statusCode" in error &&
      error.statusCode === 403
  );
  assert.throws(() =>
    assertAdminAccessIsNotGranted([], [PERMISSIONS.ADMIN_USERS_UPDATE])
  );
});

test("an existing admin keeps protected role and permissions unchanged", () => {
  assert.deepEqual(
    protectAdminUserAccess({
      currentRoles: [ROLES.ADMIN],
      currentPermissions: [PERMISSIONS.ADMIN_USERS_READ],
      requestedRoles: [ROLES.PENTESTER],
      requestedPermissions: [
        PERMISSIONS.ADMIN_USERS_UPDATE,
        PERMISSIONS.PENTEST_DASHBOARD_READ,
      ],
    }),
    {
      roles: [ROLES.ADMIN, ROLES.PENTESTER],
      permissions: [
        PERMISSIONS.ADMIN_USERS_READ,
        PERMISSIONS.PENTEST_DASHBOARD_READ,
      ],
    }
  );
});

test("an admin cannot deactivate their own account", () => {
  assert.throws(
    () =>
      assertAdminCannotDeactivateSelf({
        actorUserId: "admin-1",
        targetUserId: "admin-1",
        currentRoles: [ROLES.ADMIN],
        requestedStatus: "Inactive",
      }),
    (error: unknown) =>
      error instanceof Error &&
      "statusCode" in error &&
      error.statusCode === 400
  );

  assert.doesNotThrow(() =>
    assertAdminCannotDeactivateSelf({
      actorUserId: "admin-1",
      targetUserId: "user-1",
      currentRoles: [ROLES.PENTESTER],
      requestedStatus: "Inactive",
    })
  );
});
