import assert from "node:assert/strict";
import test from "node:test";
import { PROJECT_PROVISIONING_STATUS } from "@/constants/projects";
import {
  assertProvisioningTransitionAllowed,
  buildInitialDevopsAssignmentNotification,
  getEffectiveProvisioningStatus,
} from "./projectProvisioning.service";

test("legacy projects without a provisioning status remain ready", () => {
  assert.equal(
    getEffectiveProvisioningStatus({}),
    PROJECT_PROVISIONING_STATUS.DEVOPS_READY
  );
});

test("new projects retain their explicit awaiting status", () => {
  assert.equal(
    getEffectiveProvisioningStatus({
      provisioningStatus: PROJECT_PROVISIONING_STATUS.AWAITING_DEVOPS_SETUP,
    }),
    PROJECT_PROVISIONING_STATUS.AWAITING_DEVOPS_SETUP
  );
});

test("initial assignment notification targets only the assigned DevOps user", () => {
  const notification = buildInitialDevopsAssignmentNotification({
    projectId: "6873701345c1e884213c070b",
    projectName: "Customer portal",
    devopsUserId: "6728b49f0674310b28b82800",
  });
  assert.equal(notification.userId, "6728b49f0674310b28b82800");
  assert.equal(notification.type, "project.devops_assigned");
  assert.equal(notification.actionUrl, "/projects/6873701345c1e884213c070b");
  assert.match(notification.message, /prepare the environment/);
});

test("valid transition preconditions pass", () => {
  assert.doesNotThrow(() =>
    assertProvisioningTransitionAllowed(
      PROJECT_PROVISIONING_STATUS.DEVOPS_IN_PROGRESS,
      PROJECT_PROVISIONING_STATUS.DEVOPS_IN_PROGRESS,
      PROJECT_PROVISIONING_STATUS.DEVOPS_READY
    )
  );
});

test("duplicate or stale provisioning submissions are rejected", () => {
  assert.throws(
    () =>
      assertProvisioningTransitionAllowed(
        PROJECT_PROVISIONING_STATUS.DEVOPS_READY,
        PROJECT_PROVISIONING_STATUS.DEVOPS_IN_PROGRESS,
        PROJECT_PROVISIONING_STATUS.DEVOPS_READY
      ),
    /Invalid provisioning transition/
  );
});
