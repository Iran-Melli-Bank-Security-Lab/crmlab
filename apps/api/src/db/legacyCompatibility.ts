import mongoose from "mongoose";
import { LEGACY_COLLECTION_NAMES, LEGACY_COLLECTIONS } from "@/constants/legacyCollections";

export type LegacyCollectionStatus = {
  available: string[];
  missing: string[];
};

export function getLegacyCollectionStatus(available: string[]): LegacyCollectionStatus {
  const availableSet = new Set(available);
  return {
    available: LEGACY_COLLECTION_NAMES.filter((name) => availableSet.has(name)),
    missing: LEGACY_COLLECTION_NAMES.filter((name) => !availableSet.has(name)),
  };
}

export async function validateLegacyCollections() {
  const database = mongoose.connection.db;
  if (!database) return;

  const collections = await database.listCollections({}, { nameOnly: true }).toArray();
  const status = getLegacyCollectionStatus(collections.map(({ name }) => name));

  console.info(
    `[legacy-db] database=${database.databaseName} mappings=` +
      `User:${LEGACY_COLLECTIONS.users},` +
      `Vulnerability:${LEGACY_COLLECTIONS.foundedBugs},` +
      `Project:${LEGACY_COLLECTIONS.projects},` +
      `ProjectAssignment:${LEGACY_COLLECTIONS.projectUsers}`
  );

  if (status.missing.length) {
    console.warn(
      `[legacy-db] Missing expected legacy collections: ${status.missing.join(", ")}. ` +
      "No collection was created or migrated automatically."
    );
  }
}

