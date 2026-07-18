import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeNotificationPriority,
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

