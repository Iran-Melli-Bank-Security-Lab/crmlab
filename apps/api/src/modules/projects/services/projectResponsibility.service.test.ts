import assert from "node:assert/strict";
import test from "node:test";
import { PERMISSIONS } from "@/constants/permissions";
import {
  groupUserAssignmentRoles,
  getResponsibilityProjectIdsByView,
  resolveProjectResponsibilities,
  resolveResponsibilityRowActions,
} from "./projectResponsibility.service";

test("groups direct and manager relationships without inferring global roles", () => {
  const roles = groupUserAssignmentRoles([
    { projectId: "project-1", userId: "user-1", assignmentRole: "devops" },
    { projectId: "project-1", pentester: "user-1" },
    { projectId: "project-2", userId: "user-2", managerId: "user-1" },
  ], "user-1");

  assert.deepEqual(roles.get("project-1"), ["devops", "pentester"]);
  assert.deepEqual(roles.get("project-2"), ["manager"]);
});

test("resolves multiple canonical and legacy project responsibilities in registry order", () => {
  const userId = "507f191e810c19729de860ea";
  const responsibilities = resolveProjectResponsibilities({
    userId,
    assignmentRoles: ["devops", "pentester"],
    project: {
      type: "security",
      projectManager: userId,
      representative: userId,
    },
  });

  assert.deepEqual(responsibilities, [
    "pentester",
    "devops",
    "security_manager",
    "representative",
  ]);
});

test("legacy manager assignments are specialized by project type", () => {
  assert.deepEqual(resolveProjectResponsibilities({
    userId: "user-1",
    assignmentRoles: ["manager"],
    project: { type: "quality" },
  }), ["quality_manager"]);
  assert.deepEqual(resolveProjectResponsibilities({
    userId: "user-1",
    assignmentRoles: ["admin"],
    project: { ownerId: "someone-else" },
  }), ["admin"]);
});

test("row actions require both a project responsibility and its permission", () => {
  const permissions = [
    PERMISSIONS.PENTEST_PROJECTS_READ,
    PERMISSIONS.SECURITY_PROJECTS_ASSIGN,
  ];

  assert.deepEqual(
    [...resolveResponsibilityRowActions(["pentester"], permissions)].sort(),
    ["open-pentest-workspace", "view-project"]
  );
  assert.equal(
    resolveResponsibilityRowActions(["security_manager"], permissions)
      .has("assign-pentesters"),
    true
  );
  assert.equal(
    resolveResponsibilityRowActions(["devops"], [PERMISSIONS.PENTEST_PROJECTS_READ])
      .has("view-project"),
    false
  );
});

test("view project ids are derived from the centralized assignment registry", () => {
  const assignments = new Map([
    ["project-1", ["pentester", "devops"]],
    ["project-2", ["qa"]],
    ["project-3", ["representative"]],
  ]);

  assert.deepEqual([...getResponsibilityProjectIdsByView(assignments, "pentest")], ["project-1"]);
  assert.deepEqual([...getResponsibilityProjectIdsByView(assignments, "qa")], ["project-2"]);
  assert.deepEqual(
    [...getResponsibilityProjectIdsByView(assignments, "representative")],
    ["project-3"]
  );
});
