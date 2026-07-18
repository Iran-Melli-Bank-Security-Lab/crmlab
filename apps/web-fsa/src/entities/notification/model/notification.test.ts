import assert from "node:assert/strict";
import test from "node:test";
import { normalizeNotificationPriority } from "./notification";

test("normalizes legacy and unknown notification priorities safely", () => {
  assert.equal(normalizeNotificationPriority("normal"), "medium");
  assert.equal(normalizeNotificationPriority(undefined), "medium");
  assert.equal(normalizeNotificationPriority("URGENT"), "critical");
  assert.equal(normalizeNotificationPriority("HIGH"), "high");
});

