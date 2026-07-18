import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import { LEGACY_COLLECTIONS } from "@/constants/legacyCollections";
import { getLegacyCollectionStatus } from "./legacyCompatibility";
import { normalizeRoles, UserModel } from "@/modules/users/models/user.model";
import { ROLES } from "@/constants/roles";
import { ProjectModel } from "@/modules/projects/models/project.model";
import { ProjectAssignmentModel } from "@/modules/projects/models/projectAssignment.model";
import { VulnerabilityModel } from "@/modules/pentest/models/vulnerability.model";

test("current model names are pinned to the four legacy collections", () => {
  assert.equal(UserModel.collection.collectionName, LEGACY_COLLECTIONS.users);
  assert.equal(ProjectModel.collection.collectionName, LEGACY_COLLECTIONS.projects);
  assert.equal(ProjectAssignmentModel.collection.collectionName, LEGACY_COLLECTIONS.projectUsers);
  assert.equal(VulnerabilityModel.collection.collectionName, LEGACY_COLLECTIONS.foundedBugs);
  assert.equal(mongoose.models.FoundedBug, undefined);
});

test("legacy ObjectId relationship fields retain their model references", () => {
  assert.equal(ProjectAssignmentModel.schema.path("project")?.options.ref, "Project");
  assert.equal(ProjectAssignmentModel.schema.path("pentester")?.options.ref, "User");
  assert.equal(VulnerabilityModel.schema.path("project")?.options.ref, "Project");
  assert.equal(VulnerabilityModel.schema.path("user")?.options.ref, "User");
});

test("collection validation reports missing collections without changing names", () => {
  assert.deepEqual(getLegacyCollectionStatus(["users", "projects"]), {
    available: ["users", "projects"],
    missing: ["foundedbugs", "projectusers"],
  });
});

test("legacy assignment identities normalize without changing ObjectIds", async () => {
  const project = new mongoose.Types.ObjectId();
  const pentester = new mongoose.Types.ObjectId();
  const assignment = new ProjectAssignmentModel({ project, pentester, version: "legacy" });
  await assignment.validate();
  assert.equal(String(assignment.projectId), String(project));
  assert.equal(String(assignment.userId), String(pentester));
});

test("legacy users and projects hydrate without current-only fields", () => {
  const userId = new mongoose.Types.ObjectId();
  const legacyUser = UserModel.hydrate({
    _id: userId,
    username: "legacy-user",
    password: "existing-hash",
    roles: { User: 1, Admin: 0 },
    security: true,
  });
  assert.equal(String(legacyUser._id), String(userId));
  assert.deepEqual(normalizeRoles(legacyUser), [ROLES.REPRESENTATIVE, ROLES.PENTESTER]);

  const projectId = new mongoose.Types.ObjectId();
  const legacyProject = ProjectModel.hydrate({
    _id: projectId,
    projectName: "Legacy project",
    projectType: ["security"],
  });
  assert.equal(String(legacyProject._id), String(projectId));
  assert.equal(legacyProject.projectName, "Legacy project");
});

test("legacy bug aliases validate without requiring current-only fields", async () => {
  const project = new mongoose.Types.ObjectId();
  const user = new mongoose.Types.ObjectId();
  const bug = new VulnerabilityModel({ project, user, bugTitle: "Legacy bug" });
  await bug.validate();
  assert.equal(String(bug.projectId), String(project));
  assert.equal(String(bug.createdBy), String(user));
  assert.equal(bug.title, "Legacy bug");
});
