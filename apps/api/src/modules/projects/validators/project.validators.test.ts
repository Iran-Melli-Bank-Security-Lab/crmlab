import assert from "node:assert/strict";
import test from "node:test";
import {
  createProjectRequestSchema,
  provisioningBlockedSchema,
  provisioningResolutionSchema,
} from "./project.validators";

const id = {
  admin: "6728b0f79e86ad91f925f61d",
  securityManager: "6728b49f0674310b28b82800",
  qualityManager: "6728b49f0674310b28b82801",
  devops: "6728b49f0674310b28b82802",
  representative: "6728b49f0674310b28b82803",
};
const base = {
  projectName: "Customer portal",
  version: "1.0",
  letterNumber: "SEC-1",
  platform: "web",
  certificateRequired: false,
  certificateAuthorities: [],
  devopsManagerId: id.devops,
  representativeId: id.representative,
  testEndDate: "2030-01-01",
};

test("accepts a security project with its required responsibilities and deadline", () => {
  assert.equal(
    createProjectRequestSchema.parse({
      ...base,
      type: "security",
      projectManagerId: id.securityManager,
    }).projectManagerId,
    id.securityManager
  );
});

test("representative resolution requires a non-empty explanation", () => {
  const params = { id: "6873701345c1e884213c070b" };
  assert.equal(
    provisioningResolutionSchema.safeParse({
      params,
      body: { resolutionMessage: " " },
    }).success,
    false
  );
  assert.equal(
    provisioningResolutionSchema.safeParse({
      params,
      body: {
        resolutionMessage:
          "The client supplied corrected credentials and the VPN connection was verified.",
      },
    }).success,
    true
  );
});

test("accepts a quality project with its required responsibilities and deadline", () => {
  assert.equal(
    createProjectRequestSchema.parse({
      ...base,
      type: "quality",
      qualityManagerId: id.qualityManager,
    }).qualityManagerId,
    id.qualityManager
  );
});

test("rejects a manager field from the other project workflow", () => {
  const result = createProjectRequestSchema.safeParse({
    ...base,
    type: "quality",
    projectManagerId: id.securityManager,
    qualityManagerId: id.qualityManager,
  });
  assert.equal(result.success, false);
});

test("blocked provisioning requires a non-empty failure reason", () => {
  const result = provisioningBlockedSchema.safeParse({
    params: { id: "6873701345c1e884213c070b" },
    body: { failureReason: " ", technicalDescription: "VM failed to start" },
  });
  assert.equal(result.success, false);
});
