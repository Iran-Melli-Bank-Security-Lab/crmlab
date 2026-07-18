import assert from "node:assert/strict";
import test from "node:test";
import { getEffectiveProjectType } from "./project.mapper";

test("project type normalization accepts canonical security projects", () => {
  assert.equal(getEffectiveProjectType({ type: "security" }), "security");
});

test("project type normalization accepts legacy security arrays case-insensitively", () => {
  assert.equal(
    getEffectiveProjectType({ projectType: ["Security"] }),
    "security"
  );
});

test("project type normalization preserves legacy quality classification", () => {
  assert.equal(
    getEffectiveProjectType({ projectType: ["Quality"] }),
    "quality"
  );
});

test("project type normalization can fall back from an invalid canonical value", () => {
  assert.equal(
    getEffectiveProjectType({ type: "legacy", projectType: ["Security"] }),
    "security"
  );
});

test("project type normalization rejects unknown classifications", () => {
  assert.equal(getEffectiveProjectType({ projectType: ["Unknown"] }), undefined);
});
