import assert from "node:assert/strict";
import test from "node:test";
import { encryptSecret } from "./credentialCipher.service";
import {
  buildProjectDevopsAccessView,
  detectDevopsNotificationChange,
  assertPersonalDevopsTargetsAreCurrentAssignments,
  selectCurrentPentesterAssignments,
} from "./devopsInfo.service";

const endpoint = (password: string) => ({
  clientId: "endpoint-1",
  url: "https://environment.example.test",
  ipAddress: "192.0.2.10",
  port: 443,
  description: "Test environment",
  authenticationAccounts: [{
    clientId: "account-1",
    authenticationMethod: "username_password_otp",
    username: "tester",
    password: encryptSecret(password),
    otp: { type: "totp", secret: encryptSecret("must-not-leave-api"), instructions: "Use your enrolled authenticator." },
  }],
});

test("shared access returns one shared projection and never returns an OTP seed", () => {
  const view = buildProjectDevopsAccessView(
    { deploymentMode: "shared_vm", sharedVm: { endpoints: [endpoint("shared-password")] } },
    "user-a",
    new Set(["assignment-a"])
  );

  assert.equal(view?.mode, "shared");
  assert.equal(view?.endpoints[0].authenticationAccounts[0].password, "shared-password");
  assert.equal("secret" in (view?.endpoints[0].authenticationAccounts[0].otp || {}), false);
});

test("personal access is selected from authenticated user and active assignment together", () => {
  const stored = {
    deploymentMode: "separate_vm_per_user",
    separateVm: {
      serverIpAddress: "198.51.100.5",
      serverPort: 22,
      vmPassword: encryptSecret("shared-secret-must-not-leave-api"),
      users: [
        { assignmentId: "assignment-a", userId: "user-a", serverUsername: "alice", serverPassword: encryptSecret("alice-password"), vmIpAddress: "192.0.2.11", vmPort: 22, endpoints: [] },
        { assignmentId: "assignment-b", userId: "user-b", serverUsername: "bob", serverPassword: encryptSecret("bob-password"), vmIpAddress: "192.0.2.12", vmPort: 22, endpoints: [] },
      ],
    },
  };

  const alice = buildProjectDevopsAccessView(stored, "user-a", new Set(["assignment-a"]));
  const bob = buildProjectDevopsAccessView(stored, "user-b", new Set(["assignment-b"]));
  const forged = buildProjectDevopsAccessView(stored, "user-a", new Set(["assignment-b"]));

  assert.equal(alice?.mode, "personal");
  assert.equal(alice?.assignmentState, "available");
  assert.equal(alice?.username, "alice");
  assert.equal(alice?.password, "alice-password");
  assert.equal(bob?.username, "bob");
  assert.equal(bob?.password, "bob-password");
  assert.equal(forged?.assignmentState, "unassigned");
  assert.equal("vmPassword" in (alice || {}), false);
});

test("users without an active assignment receive no credential projection", () => {
  const view = buildProjectDevopsAccessView(
    { deploymentMode: "shared_vm", sharedVm: { endpoints: [endpoint("secret")] } },
    "user-a",
    new Set()
  );

  assert.equal(view, null);
});

function personalUser(userId: string, assignmentId: string, password: string, ip: string) {
  return {
    assignmentId,
    userId,
    serverUsername: userId,
    serverPassword: encryptSecret(password),
    vmIpAddress: ip,
    vmPort: 22,
    endpoints: [endpoint(`${userId}-endpoint-password`)],
  };
}

function personalInfo(users: any[], serverIpAddress = "198.51.100.5") {
  return {
    deploymentMode: "separate_vm_per_user",
    separateVm: {
      serverIpAddress,
      serverPort: 22,
      vmUsername: "lab",
      vmPassword: encryptSecret("lab-password"),
      users,
    },
  };
}

test("creating per-user information targets each dedicated environment owner once", () => {
  const change = detectDevopsNotificationChange(null, personalInfo([
    personalUser("user-a", "assignment-a", "password-a", "192.0.2.11"),
    personalUser("user-a", "assignment-a-2", "password-a-2", "192.0.2.12"),
  ]));

  assert.deepEqual(change, {
    action: "created",
    mode: "personal",
    targetUserIds: ["user-a"],
  });
});

test("equivalent per-user information with newly encrypted equal secrets is a no-change", () => {
  const previous = personalInfo([
    personalUser("user-a", "assignment-a", "password-a", "192.0.2.11"),
    personalUser("user-b", "assignment-b", "password-b", "192.0.2.12"),
  ]);
  const submittedAgain = personalInfo([
    personalUser("user-b", "assignment-b", "password-b", "192.0.2.12"),
    personalUser("user-a", "assignment-a", "password-a", "192.0.2.11"),
  ]);

  assert.equal(detectDevopsNotificationChange(previous, submittedAgain), null);
});

test("updating one personal environment targets only that user", () => {
  const previous = personalInfo([
    personalUser("user-a", "assignment-a", "password-a", "192.0.2.11"),
    personalUser("user-b", "assignment-b", "password-b", "192.0.2.12"),
  ]);
  const updated = personalInfo([
    personalUser("user-a", "assignment-a", "new-password-a", "192.0.2.11"),
    personalUser("user-b", "assignment-b", "password-b", "192.0.2.12"),
  ]);

  assert.deepEqual(detectDevopsNotificationChange(previous, updated), {
    action: "updated",
    mode: "personal",
    targetUserIds: ["user-a"],
  });
});

test("updating shared per-user infrastructure targets all affected environment owners", () => {
  const users = [
    personalUser("user-a", "assignment-a", "password-a", "192.0.2.11"),
    personalUser("user-b", "assignment-b", "password-b", "192.0.2.12"),
  ];

  assert.deepEqual(
    detectDevopsNotificationChange(personalInfo(users), personalInfo(users, "198.51.100.6")),
    { action: "updated", mode: "personal", targetUserIds: ["user-a", "user-b"] }
  );
});

test("shared information detects create, update, and order-independent no-change", () => {
  const firstEndpoint = endpoint("shared-password");
  const secondEndpoint = { ...endpoint("other-password"), clientId: "endpoint-2" };
  const created = { deploymentMode: "shared_vm", sharedVm: { endpoints: [firstEndpoint] } };
  const updated = { deploymentMode: "shared_vm", sharedVm: { endpoints: [firstEndpoint, secondEndpoint] } };
  const reordered = { deploymentMode: "shared_vm", sharedVm: { endpoints: [secondEndpoint, firstEndpoint] } };

  assert.deepEqual(detectDevopsNotificationChange(null, created), { action: "created", mode: "shared" });
  assert.deepEqual(detectDevopsNotificationChange(created, updated), { action: "updated", mode: "shared" });
  assert.equal(detectDevopsNotificationChange(updated, reordered), null);
});

test("separate VM choices include only current Pentester ProjectUser assignments", () => {
  const assignments = [
    { _id: "assignment-a-devops", userId: "user-a", assignmentRole: "devops", status: "open" },
    { _id: "assignment-a-pentest", userId: "user-a", assignmentRole: "pentester", status: "in_progress" },
    { _id: "assignment-manager", userId: "manager", assignmentRole: "security_manager", status: "open" },
    { _id: "assignment-devops-manager", userId: "devops-manager", assignmentRole: "devops_manager", status: "open" },
    { _id: "assignment-legacy-pentester", pentester: "legacy-user", status: "open" },
    { _id: "assignment-b", userId: "user-b", status: "removed" },
    { _id: "assignment-c", pentester: "user-c", status: "finished" },
    { _id: "assignment-d", userId: "user-d", status: "inactive" },
  ];

  const selected = selectCurrentPentesterAssignments(
    assignments,
    new Set(["assignment-a-pentest"])
  );

  assert.equal(selected.length, 2);
  assert.equal(String(selected[0]._id), "assignment-a-pentest");
  assert.equal(String(selected[0].userId), "user-a");
  assert.equal(String(selected[1].pentester), "legacy-user");
});

test("backend per-user validation requires a current assignment in the same project", () => {
  const assignments = [
    { _id: "assignment-a", userId: "user-a", status: "open" },
    { _id: "assignment-b", userId: "user-b", status: "removed" },
    { _id: "assignment-c", userId: "user-c", status: "finished" },
  ];

  assert.doesNotThrow(() => assertPersonalDevopsTargetsAreCurrentAssignments(
    [{ assignmentId: "assignment-a", userId: "user-a" }],
    assignments,
    new Set(["user-a", "user-b", "user-c"])
  ));
  assert.throws(() => assertPersonalDevopsTargetsAreCurrentAssignments(
    [{ assignmentId: "assignment-b", userId: "user-b" }],
    assignments,
    new Set(["user-a", "user-b", "user-c"])
  ), /current project assignment/);
  assert.throws(() => assertPersonalDevopsTargetsAreCurrentAssignments(
    [{ assignmentId: "other-project-assignment", userId: "user-a" }],
    assignments,
    new Set(["user-a", "user-b", "user-c"])
  ), /current project assignment/);
  assert.throws(() => assertPersonalDevopsTargetsAreCurrentAssignments(
    [
      { assignmentId: "assignment-a", userId: "user-a" },
      { assignmentId: "assignment-a-duplicate-role", userId: "user-a" },
    ],
    assignments,
    new Set(["user-a"])
  ), /only one per-user environment/);
});

test("backend rejects DevOps managers, project managers, and inactive users as personal VM targets", () => {
  const assignments = [
    { _id: "pentester", userId: "pentester-user", assignmentRole: "pentester", status: "open" },
    { _id: "devops-manager", userId: "devops-user", assignmentRole: "devops_manager", status: "open" },
    { _id: "project-manager", userId: "manager-user", assignmentRole: "security_manager", status: "open" },
    { _id: "removed-pentester", userId: "removed-user", assignmentRole: "pentester", status: "removed" },
    { _id: "inactive-pentester", userId: "inactive-user", assignmentRole: "pentester", status: "open" },
  ];
  const activeUserIds = new Set(["pentester-user", "devops-user", "manager-user", "removed-user"]);

  assert.doesNotThrow(() => assertPersonalDevopsTargetsAreCurrentAssignments(
    [{ assignmentId: "pentester", userId: "pentester-user" }], assignments, activeUserIds
  ));
  for (const target of [
    { assignmentId: "devops-manager", userId: "devops-user" },
    { assignmentId: "project-manager", userId: "manager-user" },
    { assignmentId: "removed-pentester", userId: "removed-user" },
    { assignmentId: "inactive-pentester", userId: "inactive-user" },
  ]) {
    assert.throws(() => assertPersonalDevopsTargetsAreCurrentAssignments(
      [target], assignments, activeUserIds
    ), /current project assignment/);
  }
});
