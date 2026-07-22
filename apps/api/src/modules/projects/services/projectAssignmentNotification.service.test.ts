import assert from "node:assert/strict";
import test from "node:test";
import { buildProjectAssignmentNotificationInputs } from "./projectAssignmentNotification.service";

test("builds a durable, role-aware project assignment notification", () => {
  const [notification] = buildProjectAssignmentNotificationInputs({
    projectId: "6873701345c1e884213c070b",
    projectName: "Customer portal",
    assignedById: "6728b0f79e86ad91f925f61d",
    assignments: [{
      assignmentId: "6a60491df8674cb4234a965d",
      userId: "6728b49f0674310b28b82800",
      assignmentRole: "security_manager",
    }],
  });

  assert.equal(notification.type, "project.assigned");
  assert.equal(notification.userId, "6728b49f0674310b28b82800");
  assert.equal(notification.actionUrl, "/projects/6873701345c1e884213c070b");
  assert.equal(notification.dedupeKey, "project.assigned:6a60491df8674cb4234a965d");
  assert.match(notification.message, /Customer portal.*security manager/);
  assert.deepEqual(notification.data, {
    assignmentId: "6a60491df8674cb4234a965d",
    assignmentRole: "security_manager",
    assignedById: "6728b0f79e86ad91f925f61d",
  });
});
