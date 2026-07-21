import assert from "node:assert/strict";
import test from "node:test";
import {
  isNotificationRead,
  normalizeNotificationPriority,
  normalizeNotificationType,
  readStateNotificationFilter,
  recipientNotificationFilter,
  serializeCompatibleNotification,
} from "./notificationCompatibility.service";

test("legacy normal priority falls back to the current medium style", () => {
  assert.equal(normalizeNotificationPriority("normal"), "medium");
  assert.equal(normalizeNotificationPriority("urgent"), "critical");
});

test("legacy notification fields serialize without losing read state or links", () => {
  const payload = serializeCompatibleNotification({
    _id: { toString: () => "legacy-notification" },
    userId: "legacy-user",
    type: "projectAssigned",
    title: "Assigned",
    message: "Legacy assignment",
    priority: "normal",
    seen: true,
    link: "/projects/legacy",
    createdAt: new Date("2024-01-01T00:00:00Z"),
  });

  assert.equal(payload.type, "project.assigned");
  assert.equal(payload.priority, "medium");
  assert.equal(payload.isRead, true);
  assert.equal(payload.actionUrl, "/projects/legacy");
});

test("legacy status and category fields map to the canonical contract", () => {
  assert.equal(isNotificationRead({ status: "seen" }), true);
  assert.equal(isNotificationRead({ isRead: false, seen: true }), true);
  assert.equal(isNotificationRead({ isRead: false, seen: false, status: "sent" }), false);
  assert.equal(normalizeNotificationType("alert", "report"), "project.report_submitted");

  const payload = serializeCompatibleNotification({
    _id: { toString: () => "legacy-report", getTimestamp: () => new Date("2025-01-01T00:00:00Z") },
    userId: "legacy-user",
    type: "alert",
    category: "report",
    title: "Report",
    message: "Ready",
    status: "sent",
    link: "/project/report/report-id",
    data: { project: "project-id", assignedBy: "actor-id" },
  });

  assert.equal(payload.projectId, "project-id");
  assert.equal(payload.actionUrl, "/projects/project-id");
  assert.equal(payload.type, "project.report_submitted");
  assert.equal(payload.createdAt.toISOString(), "2025-01-01T00:00:00.000Z");
});

test("ownership and read filters include legacy recipient and state aliases", () => {
  const recipientFilter = recipientNotificationFilter("6728b49f0674310b28b82800") as { $or: Array<Record<string, unknown>> };
  assert.ok(recipientFilter.$or.some((condition) => "userId" in condition));
  assert.ok(recipientFilter.$or.some((condition) => "recipientId" in condition));
  assert.ok(recipientFilter.$or.some((condition) => "data.userId" in condition));

  const unreadFilter = readStateNotificationFilter(false) as { $nor: unknown[] };
  assert.equal(unreadFilter.$nor.length, 3);
});
