import assert from "node:assert/strict";
import test from "node:test";
import { loginSchema, registerSchema } from "./auth.validators";

test("login accepts an existing one-character password but rejects an empty password", () => {
  assert.equal(
    loginSchema.safeParse({ body: { username: "ab", password: "x" } }).success,
    true
  );
  assert.equal(
    loginSchema.safeParse({ body: { username: "ab", password: "" } }).success,
    false
  );
});

test("account creation keeps its password-strength requirement", () => {
  assert.equal(
    registerSchema.safeParse({ body: { username: "ab", password: "x" } }).success,
    false
  );
});
