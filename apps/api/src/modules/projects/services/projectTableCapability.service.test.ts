import assert from "node:assert/strict";
import test from "node:test";
import { PERMISSIONS, type Permission } from "@/constants/permissions";
import {
  assertProjectAssignmentActionAllowed,
  requireProjectListView,
  resolveProjectListQueryCapabilities,
  resolveProjectRowSourceFields,
  resolveProjectRowActions,
  resolveRequestedProjectColumns,
} from "./projectTableCapability.service";
import {
  sanitizeStoredProjectTableSettings,
  validateProjectTableSettings,
} from "@/modules/settings/services/projectTableSetting.service";
import { getProjectTableColumnDefinitions } from "@/modules/settings/models/projectTableColumnRegistry.model";
import { canAccessProject } from "@/middlewares/projectAccess.middleware";
import { ROLES } from "@/constants/roles";
import { resolveProjectResponsibilityContext } from "./projectResponsibility.service";

const keys = (permissions: Permission[]) =>
  resolveRequestedProjectColumns(undefined, permissions).map((column) => column.columnKey);

test("single-workflow users receive only columns granted by effective permissions", () => {
  const devops = keys([
    PERMISSIONS.DEVOPS_PROJECTS_READ,
    PERMISSIONS.DEVOPS_DEPLOYMENTS_READ,
  ]);
  assert.ok(devops.includes("environment"));
  assert.ok(devops.includes("repository"));
  assert.ok(!devops.includes("riskScore"));

  const pentest = keys([
    PERMISSIONS.PENTEST_PROJECTS_READ,
    PERMISSIONS.PENTEST_VULNERABILITIES_READ,
  ]);
  assert.ok(pentest.includes("assignmentStatus"));
  assert.ok(pentest.includes("riskScore"));
  assert.ok(!pentest.includes("environment"));

  const qa = keys([PERMISSIONS.QA_PROJECTS_READ, PERMISSIONS.QA_TEST_CASES_READ]);
  assert.ok(qa.includes("testCoverage"));
  assert.ok(!qa.includes("repository"));
});

test("multiple and overlapping permissions produce a de-duplicated union", () => {
  const permissions = [
    PERMISSIONS.DEVOPS_PROJECTS_READ,
    PERMISSIONS.DEVOPS_DEPLOYMENTS_READ,
    PERMISSIONS.QA_PROJECTS_READ,
    PERMISSIONS.QA_PROJECTS_READ,
  ];
  const columns = keys(permissions);
  assert.equal(columns.length, new Set(columns).size);
  assert.ok(columns.includes("environment"));
  assert.ok(columns.includes("assignmentStatus"));
});

test("view strategies narrow the permission union to workflow-relevant columns", () => {
  const permissions = [
    PERMISSIONS.DEVOPS_PROJECTS_READ,
    PERMISSIONS.DEVOPS_DEPLOYMENTS_READ,
    PERMISSIONS.QA_PROJECTS_READ,
  ];
  const devops = resolveRequestedProjectColumns(undefined, permissions, "devops")
    .map((column) => column.columnKey);
  const qa = resolveRequestedProjectColumns(undefined, permissions, "qa")
    .map((column) => column.columnKey);
  assert.ok(devops.includes("repository"));
  assert.ok(!devops.includes("assignmentStatus"));
  assert.ok(qa.includes("assignmentStatus"));
  assert.ok(!qa.includes("repository"));
});

test("unified rows do not compose sensitive fields from unrelated permission scopes", () => {
  const permissions = [
    PERMISSIONS.PENTEST_PROJECTS_READ,
    PERMISSIONS.PENTEST_VULNERABILITIES_READ,
    PERMISSIONS.REPRESENTATIVE_PROJECTS_READ,
  ];
  const requested = resolveRequestedProjectColumns(undefined, permissions)
    .map((column) => column.columnKey);
  const pentestFields = resolveProjectRowSourceFields(permissions, ["pentest"], requested);
  const representativeFields = resolveProjectRowSourceFields(
    permissions,
    ["representative"],
    requested
  );
  assert.ok(!pentestFields.includes("letterNumber"));
  assert.ok(representativeFields.includes("letterNumber"));
});

test("a user without project table permissions receives no non-admin columns", () => {
  assert.deepEqual(keys([]), []);
});

test("a requested view requires its own permission even when another view is granted", () => {
  assert.equal(
    requireProjectListView("devops", [PERMISSIONS.DEVOPS_PROJECTS_READ]),
    "devops"
  );
  assert.throws(
    () => requireProjectListView("representative", [PERMISSIONS.DEVOPS_PROJECTS_READ]),
    (error: unknown) => error instanceof Error && "statusCode" in error && error.statusCode === 403
  );
  assert.throws(() => requireProjectListView("forged", [PERMISSIONS.DEVOPS_PROJECTS_READ]));
});

test("the canonical project list is unified when no legacy view is requested", () => {
  assert.equal(
    requireProjectListView(undefined, [
      PERMISSIONS.PENTEST_PROJECTS_READ,
      PERMISSIONS.SECURITY_PROJECTS_READ,
    ]),
    "unified"
  );
  assert.throws(() => requireProjectListView(undefined, []));
});

test("unauthorized columns, sort fields, and filters are rejected", () => {
  const permissions = [PERMISSIONS.DEVOPS_PROJECTS_READ];
  assert.throws(
    () => resolveRequestedProjectColumns("summary,repository", permissions),
    (error: unknown) => error instanceof Error && "statusCode" in error && error.statusCode === 403
  );
  assert.throws(() => resolveProjectListQueryCapabilities({ sort: "repository" }, permissions));
  assert.throws(() => resolveProjectListQueryCapabilities({
    filters: JSON.stringify({ owner: "someone" }),
  }, permissions));
});

test("projection fields contain only fields required by authorized columns", () => {
  const result = resolveProjectListQueryCapabilities(
    { columns: "summary,status" },
    [PERMISSIONS.DEVOPS_PROJECTS_READ]
  );
  assert.deepEqual(result.columnKeys, ["summary", "status"]);
  assert.ok(result.projectionFields.includes("projectName"));
  assert.ok(result.projectionFields.includes("status"));
  assert.ok(!result.projectionFields.includes("devopsInfo.repository"));
});

test("pagination is bounded for large-list protection", () => {
  const permissions = [PERMISSIONS.DEVOPS_PROJECTS_READ];
  assert.deepEqual(
    resolveProjectListQueryCapabilities({ page: "5000", pageSize: "100" }, permissions, "devops")
      .pageSize,
    100
  );
  assert.throws(() =>
    resolveProjectListQueryCapabilities({ page: "1", pageSize: "101" }, permissions, "devops")
  );
});

test("row actions are a permission union and protected assignment actions reject callers", () => {
  const multiRoleContext = resolveProjectResponsibilityContext({
    user: {
      id: "user-1",
      permissions: [
        PERMISSIONS.PENTEST_PROJECTS_READ,
        PERMISSIONS.SECURITY_PROJECTS_READ,
        PERMISSIONS.SECURITY_PROJECTS_ASSIGN,
      ],
    },
    project: { type: "security", projectManager: "user-1" },
    assignments: [{ userId: "user-1", assignmentRole: "pentester" }],
  });
  assert.deepEqual(
    resolveProjectRowActions(multiRoleContext),
    ["view-project", "open-pentest-workspace", "assign-pentesters"]
  );
  const devopsContext = resolveProjectResponsibilityContext({
    user: { id: "user-1", permissions: [PERMISSIONS.DEVOPS_PROJECTS_READ] },
    project: { type: "devops" },
    assignments: [{ userId: "user-1", assignmentRole: "devops" }],
  });
  assert.deepEqual(
    resolveProjectRowActions(devopsContext),
    ["view-project"]
  );
  assert.throws(() =>
    assertProjectAssignmentActionAllowed(
      [PERMISSIONS.QUALITY_PROJECTS_ASSIGN],
      "pentester",
      "security"
    )
  );
  assert.doesNotThrow(() =>
    assertProjectAssignmentActionAllowed(
      [PERMISSIONS.SECURITY_PROJECTS_ASSIGN],
      "pentester",
      "security"
    )
  );
});

test("stored settings are re-sanitized after permission removal and restored safely", () => {
  const stored = {
    visibleColumns: ["summary", "environment", "repository", "obsolete"],
    columnOrder: ["repository", "summary", "environment", "obsolete"],
    aliases: { repository: "Repo", obsolete: "Bad" },
  };
  const removed = sanitizeStoredProjectTableSettings(
    "user-projects",
    stored,
    [PERMISSIONS.QA_PROJECTS_READ]
  );
  assert.deepEqual(removed.visibleColumns, ["summary"]);
  assert.ok(!removed.columnOrder.includes("repository"));
  assert.deepEqual(removed.aliases, {});

  const restored = sanitizeStoredProjectTableSettings(
    "user-projects",
    stored,
    [PERMISSIONS.DEVOPS_PROJECTS_READ, PERMISSIONS.DEVOPS_DEPLOYMENTS_READ]
  );
  assert.ok(restored.visibleColumns.includes("repository"));
  assert.equal(restored.aliases.repository, "Repo");
});

test("manipulated and malformed settings are rejected while mandatory columns remain", () => {
  assert.throws(() => validateProjectTableSettings("user-projects", {
    visibleColumns: ["repository"],
    columnOrder: ["repository"],
    aliases: {},
  }, [PERMISSIONS.QA_PROJECTS_READ]));
  assert.throws(() => validateProjectTableSettings("user-projects", {
    visibleColumns: "summary",
    columnOrder: [],
    aliases: {},
  }, [PERMISSIONS.QA_PROJECTS_READ]));

  const valid = validateProjectTableSettings("user-projects", {
    visibleColumns: [], columnOrder: [], aliases: {},
  }, [PERMISSIONS.QA_PROJECTS_READ]);
  assert.ok(valid.visibleColumns.includes("summary"));
});

test("Project is the first configurable mandatory column in every project table", () => {
  const userColumns = getProjectTableColumnDefinitions(
    "user-projects",
    [PERMISSIONS.QA_PROJECTS_READ]
  );
  const adminColumns = getProjectTableColumnDefinitions(
    "admin",
    [PERMISSIONS.ADMIN_SYSTEM_MANAGE]
  );

  for (const columns of [userColumns, adminColumns]) {
    assert.equal(columns[0]?.columnKey, "summary");
    assert.equal(columns[0]?.defaultLabel, "Project");
    assert.equal(columns[0]?.isConfigurable, true);
    assert.equal(columns[0]?.isDefaultVisible, true);
    assert.equal(columns[0]?.isMandatory, true);
  }
  assert.equal(userColumns[1]?.columnKey, "myResponsibilities");
  assert.equal(userColumns[1]?.isConfigurable, true);
  assert.equal(userColumns[1]?.isDefaultVisible, true);
});

test("security project assigners can configure the Pentesters action column", () => {
  const securityColumns = getProjectTableColumnDefinitions(
    "user-projects",
    [PERMISSIONS.SECURITY_PROJECTS_READ, PERMISSIONS.SECURITY_PROJECTS_ASSIGN]
  );
  const pentesters = securityColumns.find(
    (column) => column.columnKey === "pentesters"
  );

  assert.equal(pentesters?.defaultLabel, "Pentesters");
  assert.equal(pentesters?.faLabel, "تست‌کنندگان نفوذ");
  assert.equal(pentesters?.isConfigurable, true);
  assert.equal(pentesters?.isDefaultVisible, true);
  assert.deepEqual(pentesters?.applicableViews, ["security"]);

  const saved = validateProjectTableSettings("user-projects", {
    visibleColumns: ["summary", "pentesters"],
    columnOrder: ["summary", "pentesters"],
    aliases: { pentesters: "Security Testers" },
  }, [PERMISSIONS.SECURITY_PROJECTS_READ, PERMISSIONS.SECURITY_PROJECTS_ASSIGN]);
  assert.ok(saved.visibleColumns.includes("pentesters"));
  assert.equal(saved.aliases.pentesters, "Security Testers");

  const readOnlyColumns = getProjectTableColumnDefinitions(
    "user-projects",
    [PERMISSIONS.SECURITY_PROJECTS_READ]
  );
  assert.equal(
    readOnlyColumns.some((column) => column.columnKey === "pentesters"),
    false
  );
});

test("legacy project table settings insert a missing Project column first", () => {
  const sanitized = sanitizeStoredProjectTableSettings("user-projects", {
    visibleColumns: ["assignmentStatus"],
    columnOrder: ["assignmentStatus", "priority"],
    aliases: {},
  }, [PERMISSIONS.QA_PROJECTS_READ]);

  assert.equal(sanitized.visibleColumns[0], "summary");
  assert.equal(sanitized.columnOrder[0], "summary");
});

test("admin view authorization remains separate", () => {
  assert.equal(
    requireProjectListView("admin", [PERMISSIONS.ADMIN_SYSTEM_MANAGE]),
    "admin"
  );
  assert.throws(() => requireProjectListView("admin", [PERMISSIONS.PENTEST_PROJECTS_READ]));
});

test("row-level access remains independent from table capabilities", () => {
  const user = {
    id: "user-1",
    roles: [ROLES.DEVOPS],
    permissions: [PERMISSIONS.DEVOPS_PROJECTS_READ],
  } as Express.UserContext;
  assert.equal(canAccessProject(user, { devops: "user-2" }), false);
  assert.equal(canAccessProject(user, { devops: "user-1" }), true);
});
