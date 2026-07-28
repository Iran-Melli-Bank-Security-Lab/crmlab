import assert from "node:assert/strict";
import test from "node:test";
import {
  getProvisioningUiState,
  getDevopsTableActionLabel,
  hasNonDevopsResponsibility,
  hasRequiredFailureDetails,
  managerRequestFields,
} from "./provisioning";

test("selects the manager request field conditionally by project type", () => {
  assert.deepEqual(managerRequestFields("security", "manager-1"), {
    projectManagerId: "manager-1",
  });
  assert.deepEqual(managerRequestFields("quality", "manager-2"), {
    qualityManagerId: "manager-2",
  });
});

test("DevOps-only responsibilities are excluded from the shared projects table", () => {
  assert.equal(hasNonDevopsResponsibility(["devops_manager"]), false);
  assert.equal(
    hasNonDevopsResponsibility(["devops_manager", "security_manager"]),
    true
  );
});

test("DevOps table actions describe setup, validation, and failure states", () => {
  assert.equal(getDevopsTableActionLabel("AWAITING_DEVOPS_SETUP"), "Start setup");
  assert.equal(getDevopsTableActionLabel("DEVOPS_IN_PROGRESS"), "Continue setup");
  assert.equal(getDevopsTableActionLabel("DEVOPS_READY"), "View validated setup");
  assert.equal(getDevopsTableActionLabel("DEVOPS_BLOCKED"), "Review failed setup");
  assert.equal(
    getDevopsTableActionLabel("READY_FOR_DEVOPS_RETRY"),
    "Review resolution / retry setup"
  );
});

test("team assignment stays disabled before DevOps readiness", () => {
  assert.equal(
    getProvisioningUiState({
      status: "DEVOPS_IN_PROGRESS",
      isAdmin: false,
      isAssignedDevops: false,
      isAssignedRepresentative: false,
    }).assignmentDisabled,
    true
  );
  assert.equal(
    getProvisioningUiState({
      status: "DEVOPS_READY",
      isAdmin: false,
      isAssignedDevops: false,
      isAssignedRepresentative: false,
    }).assignmentDisabled,
    false
  );
});

test("assigned DevOps gets success and failure actions only while in progress", () => {
  const state = getProvisioningUiState({
    status: "DEVOPS_IN_PROGRESS",
    isAdmin: false,
    isAssignedDevops: true,
    isAssignedRepresentative: false,
  });
  assert.equal(state.canConfirmReady, true);
  assert.equal(state.canReportBlocked, true);
});

test("failure reporting requires a reason and technical description", () => {
  assert.equal(hasRequiredFailureDetails("", "VM failed"), false);
  assert.equal(hasRequiredFailureDetails("VM startup failure", "Hypervisor error"), true);
});

test("assigned representative can resolve only a currently blocked attempt", () => {
  const blocked = getProvisioningUiState({
    status: "DEVOPS_BLOCKED",
    isAdmin: false,
    isAssignedDevops: false,
    isAssignedRepresentative: true,
  });
  assert.equal(blocked.canSubmitResolution, true);
  assert.equal(blocked.canRetry, false);
  assert.equal(
    getProvisioningUiState({
      status: "READY_FOR_DEVOPS_RETRY",
      isAdmin: false,
      isAssignedDevops: false,
      isAssignedRepresentative: true,
    }).canSubmitResolution,
    false
  );
});

test("assigned DevOps can retry only after a representative resolution", () => {
  assert.equal(
    getProvisioningUiState({
      status: "READY_FOR_DEVOPS_RETRY",
      isAdmin: false,
      isAssignedDevops: true,
      isAssignedRepresentative: false,
    }).canRetry,
    true
  );
});
