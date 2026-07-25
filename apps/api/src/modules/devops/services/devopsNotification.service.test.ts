import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDevopsNotificationInputs,
  resolveDevopsNotificationRecipientIds,
  saveDevopsInfoAndNotify,
  type DevopsNotificationRequest,
} from "./devopsNotification.service";

const baseRequest: DevopsNotificationRequest = {
  projectId: "6873701345c1e884213c070b",
  projectName: "Customer Portal",
  mode: "personal",
  action: "created",
  actorUserId: "actor",
  operationId: "operation-1",
  targetUserIds: ["user-a"],
};

test("per-user create and update notifications use the target-specific messages", () => {
  const [created] = buildDevopsNotificationInputs(baseRequest, ["user-a"]);
  const [updated] = buildDevopsNotificationInputs(
    { ...baseRequest, action: "updated", operationId: "operation-2" },
    ["user-a"]
  );

  assert.equal(created.type, "devops.access_created");
  assert.match(created.message, /registered.*Customer Portal/);
  assert.equal(updated.type, "devops.access_updated");
  assert.match(updated.message, /Your DevOps access information.*updated/);
});

test("shared create and update notifications are built once per eligible recipient", () => {
  const created = buildDevopsNotificationInputs(
    { ...baseRequest, mode: "shared", targetUserIds: undefined },
    ["user-a", "user-b"]
  );
  const updated = buildDevopsNotificationInputs(
    { ...baseRequest, mode: "shared", action: "updated", targetUserIds: undefined },
    ["user-a", "user-b"]
  );

  assert.equal(created.length, 2);
  assert.equal(updated.length, 2);
  assert.match(created[0].message, /Shared DevOps access information.*registered/);
  assert.match(updated[0].message, /Shared DevOps information.*updated/);
});

test("recipient resolution uses active assignments, deduplicates responsibilities, and excludes removed or inactive users", () => {
  const recipients = resolveDevopsNotificationRecipientIds({
    assignments: [
      { userId: "user-a", status: "open" },
      { userId: "user-a", status: "in_progress" },
      { pentester: "user-b", status: "removed" },
      { userId: "user-c", status: "finished" },
      { userId: "inactive-user", status: "open" },
    ],
    activeUserIds: new Set(["user-a", "user-b", "user-c"]),
  });

  assert.deepEqual(recipients, ["user-a"]);
});

test("global permission holders and unrelated users are absent without a project assignment", () => {
  const recipients = resolveDevopsNotificationRecipientIds({
    assignments: [{ userId: "assigned-user", status: "open" }],
    activeUserIds: new Set(["assigned-user", "global-role-only", "unrelated-user"]),
  });

  assert.deepEqual(recipients, ["assigned-user"]);
});

test("personal targets are intersected with assignments and actor membership", () => {
  const assignments = [
    { userId: "target", status: "open" },
    { userId: "other", status: "open" },
    { userId: "actor", status: "open" },
  ];
  const activeUserIds = new Set(["target", "other", "actor"]);

  assert.deepEqual(resolveDevopsNotificationRecipientIds({ assignments, activeUserIds, targetUserIds: ["target"] }), ["target"]);
  assert.deepEqual(resolveDevopsNotificationRecipientIds({ assignments, activeUserIds, targetUserIds: ["target", "actor"] }), ["actor", "target"]);
  assert.deepEqual(resolveDevopsNotificationRecipientIds({ assignments, activeUserIds, targetUserIds: ["not-assigned"] }), []);
});

test("a failed save never attempts notification delivery", async () => {
  let notificationCalls = 0;
  await assert.rejects(() => saveDevopsInfoAndNotify({
    save: async () => { throw new Error("save failed"); },
    notification: baseRequest,
    notify: async () => { notificationCalls += 1; },
  }), /save failed/);
  assert.equal(notificationCalls, 0);
});

test("notification failure is logged without failing a successful DevOps save", async () => {
  const logs: unknown[][] = [];
  const result = await saveDevopsInfoAndNotify({
    save: async () => "saved",
    notification: baseRequest,
    notify: async () => { throw new Error("notification failed"); },
    logError: (...values) => logs.push(values),
  });

  assert.equal(result, "saved");
  assert.equal(logs.length, 1);
});

test("a project with no eligible recipients completes without creating notification inputs", async () => {
  const inputs = buildDevopsNotificationInputs(baseRequest, []);
  const result = await saveDevopsInfoAndNotify({
    save: async () => "saved",
    notification: null,
    notify: async () => { throw new Error("must not run"); },
  });

  assert.deepEqual(inputs, []);
  assert.equal(result, "saved");
});
