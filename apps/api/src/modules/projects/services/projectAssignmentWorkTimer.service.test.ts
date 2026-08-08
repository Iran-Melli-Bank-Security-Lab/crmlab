import assert from "node:assert/strict";
import test from "node:test";
import { toPentesterTableStatus } from "./projectAssignmentWorkTimer.service";

test("pentester table status follows the assignment work lifecycle", () => {
  assert.equal(toPentesterTableStatus("open"), "new");
  assert.equal(toPentesterTableStatus(undefined), "new");
  assert.equal(toPentesterTableStatus("in_progress"), "in_progress");
  assert.equal(toPentesterTableStatus("pending"), "pending");
  assert.equal(toPentesterTableStatus("finished"), "completed");
  assert.equal(toPentesterTableStatus("closed"), "completed");
  assert.equal(toPentesterTableStatus("pending", "finished"), "completed");
  assert.equal(toPentesterTableStatus("in_progress", "closed"), "completed");
});
