import assert from "node:assert/strict";
import test from "node:test";
import { encryptSecret } from "./credentialCipher.service";
import { buildProjectDevopsAccessView } from "./devopsInfo.service";

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
