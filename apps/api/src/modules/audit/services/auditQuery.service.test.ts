import assert from "node:assert/strict";
import test from "node:test";
import { ROLES } from "@/constants/roles";
import { hasRequiredRole } from "@/middlewares/permission.middleware";
import { auditLogListSchema } from "../validators/audit.validators";
import { auditModuleFromAction } from "./audit.service";
import {
  buildAuditLogFilter,
  redactAuditValue,
  type AuditLogQuery,
} from "./auditQuery.service";

const baseQuery: AuditLogQuery = {
  page: 1,
  pageSize: 25,
  sortBy: "createdAt",
  sortOrder: "desc",
};

test("audit endpoints can require the actual admin role", () => {
  assert.equal(hasRequiredRole([ROLES.ADMIN], [ROLES.ADMIN]), true);
  assert.equal(hasRequiredRole([ROLES.PENTESTER], [ROLES.ADMIN]), false);
});

test("audit response redaction recursively removes credential material", () => {
  assert.deepEqual(
    redactAuditValue({
      username: "alice",
      password: "private",
      nested: {
        accessToken: "token-value",
        safe: "visible",
      },
      values: [{ clientSecret: "secret-value" }],
    }),
    {
      username: "alice",
      password: "[REDACTED]",
      nested: {
        accessToken: "[REDACTED]",
        safe: "visible",
      },
      values: [{ clientSecret: "[REDACTED]" }],
    }
  );
});

test("audit module remains derived from the centralized action namespace", () => {
  assert.equal(auditModuleFromAction("project.assign_users"), "project");
  assert.equal(auditModuleFromAction("auth.login"), "auth");
});

test("audit query validation bounds pagination and sort fields", () => {
  assert.equal(
    auditLogListSchema.safeParse({
      query: { page: "1", pageSize: "25", sortBy: "createdAt", sortOrder: "desc" },
    }).success,
    true
  );
  assert.equal(
    auditLogListSchema.safeParse({
      query: { page: "0", pageSize: "500", sortBy: "metadata" },
    }).success,
    false
  );
});

test("audit filters escape user input and combine status and dates", async () => {
  const filter = await buildAuditLogFilter({
    ...baseQuery,
    action: "auth.*",
    status: "failure",
    from: "2026-01-01",
    to: "2026-01-31",
  });
  const conditions = (filter as { $and: Array<Record<string, unknown>> }).$and;
  const action = conditions[0].action;
  assert.equal(action instanceof RegExp, true);
  assert.equal((action as RegExp).source, "auth\\.\\*");
  const serialized = JSON.stringify(filter);
  assert.equal(serialized.includes("metadata.success"), true);
  assert.match(serialized, /createdAt/);
});
