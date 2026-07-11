import assert from "node:assert/strict";
import test from "node:test";
import { devopsInfoRequestSchema } from "./devops.validators";

const password = { value: "not-a-real-secret" };

test("shared VM accepts URL-only endpoints and username/password accounts", () => {
  const result = devopsInfoRequestSchema.safeParse({
    deploymentMode: "shared_vm",
    sharedVm: { endpoints: [{ id: "endpoint-1", url: "https://example.test", authenticationAccounts: [{ id: "account-1", authenticationMethod: "username_password", username: "tester", password }] }] },
  });
  assert.equal(result.success, true);
});

test("OTP authentication requires OTP information", () => {
  const result = devopsInfoRequestSchema.safeParse({
    deploymentMode: "shared_vm",
    sharedVm: { endpoints: [{ id: "endpoint-1", ipAddress: "10.0.0.1", port: 443, authenticationAccounts: [{ id: "account-1", authenticationMethod: "username_password_otp", username: "tester", password }] }] },
  });
  assert.equal(result.success, false);
});

test("separate VM endpoints require IP address and port", () => {
  const result = devopsInfoRequestSchema.safeParse({
    deploymentMode: "separate_vm_per_user",
    separateVm: {
      serverIpAddress: "10.0.0.1", serverPort: 22, vmUsername: "vm", vmPassword: password,
      users: [{ assignmentId: "507f1f77bcf86cd799439011", userId: "507f191e810c19729de860ea", serverUsername: "server", serverPassword: password, vmIpAddress: "10.0.0.2", vmPort: 22, endpoints: [{ id: "endpoint-1", url: "https://example.test", authenticationAccounts: [] }] }],
    },
  });
  assert.equal(result.success, false);
});
