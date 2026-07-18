import mongoose, { Types } from "mongoose";
import { env } from "@/config/env";
import { LEGACY_COLLECTIONS } from "@/constants/legacyCollections";
import { getLegacyCollectionStatus } from "./legacyCompatibility";

function bsonType(value: unknown): string {
  if (value === null) return "null";
  if (value instanceof Types.ObjectId) return "ObjectId";
  if (value instanceof Date) return "Date";
  if (Array.isArray(value)) return "Array";
  if (value && typeof value === "object" && "_bsontype" in value) {
    return String((value as { _bsontype: unknown })._bsontype);
  }
  return typeof value;
}

function detectedFields(samples: Record<string, unknown>[]) {
  const fields = new Map<string, Set<string>>();
  samples.forEach((sample) => Object.entries(sample).forEach(([key, value]) => {
    const types = fields.get(key) || new Set<string>();
    types.add(bsonType(value));
    fields.set(key, types);
  }));
  return Object.fromEntries(
    Array.from(fields.entries()).sort(([a], [b]) => a.localeCompare(b)).map(
      ([key, types]) => [key, Array.from(types).sort()]
    )
  );
}

async function referenceReport(
  sourceCollection: string,
  fields: string[],
  targetCollection: string
) {
  const database = mongoose.connection.db!;
  const available = new Set((await database.listCollections({}, { nameOnly: true }).toArray()).map(({ name }) => name));
  if (!available.has(sourceCollection) || !available.has(targetCollection)) {
    return { checked: false, invalidObjectIds: 0, missingReferences: 0 };
  }

  const values = (await Promise.all(fields.map((field) =>
    database.collection(sourceCollection).distinct(field)
  ))).flat().filter((value) => value !== null && value !== undefined);
  const unique = Array.from(new Map(values.map((value) => [String(value), value])).values());
  const validIds = unique.filter((value) => value instanceof Types.ObjectId || Types.ObjectId.isValid(String(value)));
  const invalidObjectIds = unique.length - validIds.length;
  const existing = await database.collection(targetCollection).countDocuments({
    _id: { $in: validIds.map((value) => new Types.ObjectId(String(value))) },
  });

  return {
    checked: true,
    distinctReferences: unique.length,
    invalidObjectIds,
    missingReferences: validIds.length - existing,
  };
}

async function run() {
  mongoose.set("autoCreate", false);
  mongoose.set("autoIndex", false);
  await mongoose.connect(env.mongoUri);
  const database = mongoose.connection.db!;
  const names = (await database.listCollections({}, { nameOnly: true }).toArray())
    .map(({ name }) => name)
    .sort();
  const status = getLegacyCollectionStatus(names);
  const collections: Record<string, unknown> = {};

  for (const [model, collectionName] of Object.entries(LEGACY_COLLECTIONS)) {
    if (!names.includes(collectionName)) {
      collections[model] = { collectionName, exists: false, count: 0, detectedFields: {} };
      continue;
    }
    const collection = database.collection(collectionName);
    const samples = await collection.find({}).limit(25).toArray();
    collections[model] = {
      collectionName,
      exists: true,
      count: await collection.countDocuments(),
      detectedFields: detectedFields(samples as Record<string, unknown>[]),
    };
  }

  const references = {
    projectUserToProject: await referenceReport(LEGACY_COLLECTIONS.projectUsers, ["project", "projectId"], LEGACY_COLLECTIONS.projects),
    projectUserToUser: await referenceReport(LEGACY_COLLECTIONS.projectUsers, ["pentester", "userId", "manager", "managerId"], LEGACY_COLLECTIONS.users),
    foundedBugToProject: await referenceReport(LEGACY_COLLECTIONS.foundedBugs, ["project", "projectId"], LEGACY_COLLECTIONS.projects),
    foundedBugToUser: await referenceReport(LEGACY_COLLECTIONS.foundedBugs, ["user", "pentester", "creator", "reporter", "createdBy"], LEGACY_COLLECTIONS.users),
  };
  const compatibilityIssues = status.missing.map(
    (name) => `Expected legacy collection is missing: ${name}`
  );
  const foundedBugInfo = collections.foundedBugs as { count?: number } | undefined;
  if (foundedBugInfo?.count === 0) {
    compatibilityIssues.push(
      "The foundedbugs collection is empty; its production field structure cannot be verified from this database."
    );
  }
  if (names.includes("vulnerabilities")) {
    compatibilityIssues.push(
      "A vulnerabilities collection exists alongside foundedbugs and requires manual review; this diagnostic does not copy, merge, or delete it."
    );
  }
  if (names.includes("projectassignments")) {
    compatibilityIssues.push(
      "A projectassignments collection exists alongside projectusers and requires manual review."
    );
  }

  console.log(JSON.stringify({
    readOnly: true,
    database: database.databaseName,
    availableCollections: names,
    expectedCollections: status,
    collections,
    references,
    compatibilityIssues,
  }, null, 2));
  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error("Legacy compatibility diagnostic failed", error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
