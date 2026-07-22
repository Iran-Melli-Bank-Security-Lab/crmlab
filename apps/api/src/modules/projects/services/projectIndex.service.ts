import type { IndexDescriptionInfo } from "mongodb";
import {
  PROJECT_IDENTITY_INDEX,
  ProjectModel,
} from "../models/project.model";
import {
  LEGACY_PENTESTER_IDENTITY_INDEX,
  PROJECT_ASSIGNMENT_IDENTITY_INDEX,
  ProjectAssignmentModel,
} from "../models/projectAssignment.model";

const LEGACY_PROJECT_IDENTITY_INDEX_NAME = "projectName_1_version_1";

function hasKey(
  index: IndexDescriptionInfo,
  expected: Readonly<Record<string, number>>
) {
  const entries = Object.entries(index.key);
  const expectedEntries = Object.entries(expected);
  return entries.length === expectedEntries.length && expectedEntries.every(
    ([field, direction], position) =>
      entries[position]?.[0] === field && entries[position]?.[1] === direction
  );
}

function isIndexNotFound(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: number }).code === 27
  );
}

function hasPartialFields(
  index: IndexDescriptionInfo,
  fields: readonly string[]
) {
  const partial = index.partialFilterExpression;
  return Boolean(
    partial && fields.every((field) => Object.hasOwn(partial, field))
  );
}

async function ensureAssignmentIndexes() {
  const collection = ProjectAssignmentModel.collection;
  let indexes = await collection.indexes();
  const roleAwareIndex = indexes.find(
    (index) => index.name === PROJECT_ASSIGNMENT_IDENTITY_INDEX.name
  );
  if (
    roleAwareIndex &&
    (!roleAwareIndex.unique ||
      !hasKey(roleAwareIndex, PROJECT_ASSIGNMENT_IDENTITY_INDEX.key) ||
      !hasPartialFields(roleAwareIndex, ["projectId", "userId", "version", "assignmentRole"]))
  ) {
    throw new Error(
      `Project assignment index ${PROJECT_ASSIGNMENT_IDENTITY_INDEX.name} exists with an incompatible definition`
    );
  }
  if (!roleAwareIndex) {
    await collection.createIndex(PROJECT_ASSIGNMENT_IDENTITY_INDEX.key, {
      name: PROJECT_ASSIGNMENT_IDENTITY_INDEX.name,
      ...PROJECT_ASSIGNMENT_IDENTITY_INDEX.options,
    });
    indexes = await collection.indexes();
  }

  const legacyIndex = indexes.find(
    (index) => index.name === LEGACY_PENTESTER_IDENTITY_INDEX.name
  );
  const compatibleLegacyIndex = Boolean(
    legacyIndex?.unique &&
      hasKey(legacyIndex, LEGACY_PENTESTER_IDENTITY_INDEX.key) &&
      hasPartialFields(legacyIndex, ["project", "pentester", "version"])
  );
  if (legacyIndex && !compatibleLegacyIndex) {
    try {
      await collection.dropIndex(LEGACY_PENTESTER_IDENTITY_INDEX.name);
    } catch (error) {
      if (!isIndexNotFound(error)) throw error;
    }
  }
  if (!compatibleLegacyIndex) {
    await collection.createIndex(LEGACY_PENTESTER_IDENTITY_INDEX.key, {
      name: LEGACY_PENTESTER_IDENTITY_INDEX.name,
      ...LEGACY_PENTESTER_IDENTITY_INDEX.options,
    });
    console.log(
      `Replaced obsolete project assignment index ${LEGACY_PENTESTER_IDENTITY_INDEX.name}`
    );
  }

  // autoIndex is intentionally disabled; explicitly create the remaining
  // declared query indexes after incompatible legacy constraints are repaired.
  await ProjectAssignmentModel.createIndexes();
}

export async function ensureProjectIndexes() {
  const collection = ProjectModel.collection;
  let indexes = await collection.indexes();
  const currentIndex = indexes.find(
    (index) => index.name === PROJECT_IDENTITY_INDEX.name
  );

  if (currentIndex && (!currentIndex.unique || !hasKey(currentIndex, PROJECT_IDENTITY_INDEX.key))) {
    throw new Error(
      `Project identity index ${PROJECT_IDENTITY_INDEX.name} exists with an incompatible definition`
    );
  }

  if (!currentIndex) {
    await collection.createIndex(PROJECT_IDENTITY_INDEX.key, {
      name: PROJECT_IDENTITY_INDEX.name,
      ...PROJECT_IDENTITY_INDEX.options,
    });
    indexes = await collection.indexes();
  }

  const legacyIndex = indexes.find(
    (index) =>
      index.name === LEGACY_PROJECT_IDENTITY_INDEX_NAME &&
      index.unique &&
      hasKey(index, { projectName: 1, version: 1 })
  );
  if (legacyIndex) {
    try {
      await collection.dropIndex(LEGACY_PROJECT_IDENTITY_INDEX_NAME);
      console.log(
        `Removed obsolete project index ${LEGACY_PROJECT_IDENTITY_INDEX_NAME}`
      );
    } catch (error) {
      // Multiple API instances may perform the startup migration concurrently.
      if (!isIndexNotFound(error)) throw error;
    }
  }

  await ProjectModel.createIndexes();
}

export async function ensureProjectPersistenceIndexes() {
  await ensureProjectIndexes();
  await ensureAssignmentIndexes();
}
