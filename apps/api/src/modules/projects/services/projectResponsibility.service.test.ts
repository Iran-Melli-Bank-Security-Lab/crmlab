import assert from "node:assert/strict";
import test from "node:test";
import { PERMISSIONS, type Permission } from "@/constants/permissions";
import {
  assertProjectCapability,
  getResponsibilityProjectIdsByView,
  groupDirectAssignmentRolesForVisibility,
  resolveProjectResponsibilityContext,
} from "./projectResponsibility.service";

const userId = "507f191e810c19729de860ea";
const managerProject = { type: "security", projectManager: userId };
const user = (permissions: Permission[]) => ({ id: userId, permissions });

test("security manager permission overlap does not manufacture a pentester responsibility", () => {
  const context = resolveProjectResponsibilityContext({
    user: user([
      PERMISSIONS.SECURITY_PROJECTS_READ,
      PERMISSIONS.PENTEST_PROJECTS_READ,
    ]),
    project: { ...managerProject, assignedUserIds: [userId] },
    assignments: [{
      projectId: "project-1",
      userId,
      assignmentRole: "security_manager",
    }],
  });

  assert.deepEqual(context.responsibilityKeys, ["security_manager"]);
  assert.equal(context.assignments.pentester, false);
  assert.equal(context.capabilities["open-pentest-workspace"], false);
});

test("explicit security manager and pentester assignments preserve both responsibilities", () => {
  const context = resolveProjectResponsibilityContext({
    user: user([
      PERMISSIONS.SECURITY_PROJECTS_READ,
      PERMISSIONS.PENTEST_PROJECTS_READ,
    ]),
    project: managerProject,
    assignments: [{ projectId: "project-1", userId, assignmentRole: "pentester" }],
  });

  assert.deepEqual(context.responsibilityKeys, ["pentester", "security_manager"]);
  assert.equal(context.capabilities["open-pentest-workspace"], true);
});

test("QA permission without a project QA assignment produces no QA responsibility", () => {
  const context = resolveProjectResponsibilityContext({
    user: user([PERMISSIONS.QA_PROJECTS_READ]),
    project: { type: "quality" },
    assignments: [],
  });

  assert.equal(context.assignments.qa, false);
  assert.deepEqual(context.responsibilityKeys, []);
});

test("Pentest Workspace requires permission and a real pentester assignment", () => {
  const withoutAssignment = resolveProjectResponsibilityContext({
    user: user([PERMISSIONS.PENTEST_PROJECTS_READ]),
    project: { type: "security" },
    assignments: [],
  });
  const withoutPermission = resolveProjectResponsibilityContext({
    user: user([]),
    project: { type: "security" },
    assignments: [{ projectId: "project-1", userId, assignmentRole: "pentester" }],
  });

  assert.equal(withoutAssignment.capabilities["open-pentest-workspace"], false);
  assert.equal(withoutPermission.capabilities["open-pentest-workspace"], false);
});

test("legacy ProjectUser remains supported without trusting assignedUserIds as a role", () => {
  const legacyProjectUser = resolveProjectResponsibilityContext({
    user: user([PERMISSIONS.PENTEST_PROJECTS_READ]),
    project: { type: "security" },
    assignments: [{
      project: "project-1",
      pentester: userId,
      assignmentRole: "pentester",
    }],
  });
  const legacyArrayOnly = resolveProjectResponsibilityContext({
    user: user([PERMISSIONS.PENTEST_PROJECTS_READ]),
    project: { type: "security", assignedUserIds: [userId] },
    assignments: [],
  });

  assert.deepEqual(legacyProjectUser.responsibilityKeys, ["pentester"]);
  assert.deepEqual(legacyArrayOnly.responsibilityKeys, []);
  assert.equal(legacyArrayOnly.capabilities["open-pentest-workspace"], false);
});

test("a removed pentester assignment cannot be restored by stale project membership", () => {
  const context = resolveProjectResponsibilityContext({
    user: user([PERMISSIONS.PENTEST_PROJECTS_READ]),
    project: { type: "security", assignedUserIds: [userId] },
    assignments: [{
      projectId: "project-1",
      userId,
      assignmentRole: "pentester",
      status: "removed",
    }],
  });

  assert.deepEqual(context.responsibilityKeys, []);
  assert.equal(context.assignments.pentester, false);
  assert.equal(context.capabilities["open-pentest-workspace"], false);
});

test("duplicate modern and legacy pentester sources produce one responsibility", () => {
  const context = resolveProjectResponsibilityContext({
    user: user([PERMISSIONS.PENTEST_PROJECTS_READ]),
    project: { type: "security", assignedUserIds: [userId] },
    assignments: [
      { projectId: "project-1", userId, assignmentRole: "pentester" },
      { project: "project-1", pentester: userId },
    ],
  });

  assert.deepEqual(context.responsibilityKeys, ["pentester"]);
});

test("project creator status does not create a project responsibility", () => {
  const context = resolveProjectResponsibilityContext({
    user: user([PERMISSIONS.ADMIN_SYSTEM_MANAGE, PERMISSIONS.PENTEST_PROJECTS_READ]),
    project: { type: "security", ownerId: userId },
    assignments: [],
  });

  assert.deepEqual(context.responsibilityKeys, []);
  assert.equal(context.assignments.admin, false);
});

test("multiple global permissions without assignments produce no fake roles", () => {
  const context = resolveProjectResponsibilityContext({
    user: user([
      PERMISSIONS.PENTEST_PROJECTS_READ,
      PERMISSIONS.QA_PROJECTS_READ,
      PERMISSIONS.DEVOPS_PROJECTS_READ,
      PERMISSIONS.SECURITY_PROJECTS_READ,
    ]),
    project: { type: "security" },
    assignments: [],
  });

  assert.deepEqual(context.responsibilityKeys, []);
  assert.equal(Object.values(context.assignments).some(Boolean), false);
});

test("responsibility ordering follows the registry regardless of input order", () => {
  const context = resolveProjectResponsibilityContext({
    user: user([
      PERMISSIONS.PENTEST_PROJECTS_READ,
      PERMISSIONS.DEVOPS_PROJECTS_READ,
      PERMISSIONS.SECURITY_PROJECTS_READ,
      PERMISSIONS.REPRESENTATIVE_PROJECTS_READ,
    ]),
    project: {
      type: "security",
      projectManager: userId,
      representative: userId,
    },
    assignments: [
      { projectId: "project-1", userId, assignmentRole: "devops" },
      { projectId: "project-1", userId, assignmentRole: "pentester" },
    ],
  });

  assert.deepEqual(context.responsibilityKeys, [
    "pentester",
    "devops",
    "security_manager",
    "representative",
  ]);
});

test("backend capability assertion rejects a missing project assignment", () => {
  const context = resolveProjectResponsibilityContext({
    user: user([PERMISSIONS.PENTEST_PROJECTS_READ]),
    project: { type: "security" },
    assignments: [],
  });

  assert.throws(
    () => assertProjectCapability(context, "open-pentest-workspace"),
    (error: unknown) => error instanceof Error &&
      "statusCode" in error && error.statusCode === 403
  );
});

test("visibility assignment grouping remains separate from responsibility resolution", () => {
  const grouped = groupDirectAssignmentRolesForVisibility([
    { projectId: "project-1", userId, assignmentRole: "devops" },
    { project: "project-2", pentester: userId },
  ], userId);
  assert.deepEqual([...getResponsibilityProjectIdsByView(grouped, "devops")], ["project-1"]);
  assert.deepEqual([...getResponsibilityProjectIdsByView(grouped, "pentest")], ["project-2"]);
});
