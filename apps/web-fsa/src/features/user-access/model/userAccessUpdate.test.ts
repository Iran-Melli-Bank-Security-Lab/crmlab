import assert from "node:assert/strict";
import test from "node:test";
import { buildUserUpdateRequest } from "@/entities/user/api/userUpdateRequest";
import {
  buildUserAccessUpdate,
  canChangeUserStatus,
  getVisiblePermissions,
  getVisibleRoles,
  preserveAdminPermissions,
} from "./userAccessUpdate";

test("user access updates retain removed roles and an empty permission array", () => {
  const payload = buildUserAccessUpdate({
    id: "user-1",
    roles: ["pentester"],
    permissions: [],
    status: "Active",
  });

  assert.deepEqual(payload, {
    id: "user-1",
    roles: ["pentester"],
    permissions: [],
    status: "Active",
  });

  assert.deepEqual(buildUserUpdateRequest(payload), {
    url: "/users/user-1",
    method: "PUT",
    body: {
      roles: ["pentester"],
      permissions: [],
      status: "Active",
    },
  });
});

test("admin access is hidden for other users and read-only for an admin", () => {
  const roles = ["admin", "pentester", "devops"] as const;
  const permissions = [
    "admin.users.update.all",
    "pentest.dashboard.read.own",
  ] as const;

  assert.deepEqual(getVisibleRoles([...roles], ["pentester"]), ["pentester", "devops"]);
  assert.deepEqual(getVisiblePermissions([...permissions], ["pentester"]), [
    "pentest.dashboard.read.own",
  ]);
  assert.deepEqual(getVisibleRoles([...roles], ["admin"]), [...roles]);
  assert.deepEqual(getVisiblePermissions([...permissions], ["admin"]), [...permissions]);
  assert.deepEqual(
    preserveAdminPermissions(
      ["admin.users.update.all", "pentest.dashboard.read.own"],
      ["devops.dashboard.read.assigned"],
      true
    ),
    ["admin.users.update.all", "devops.dashboard.read.assigned"]
  );
});

test("only the signed-in admin's own state control is disabled", () => {
  assert.equal(
    canChangeUserStatus({
      currentUserId: "admin-1",
      selectedUserId: "admin-1",
      selectedUserRoles: ["admin"],
    }),
    false
  );
  assert.equal(
    canChangeUserStatus({
      currentUserId: "admin-1",
      selectedUserId: "user-1",
      selectedUserRoles: ["pentester"],
    }),
    true
  );
});
