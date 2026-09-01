import mongoose from "mongoose";
import { env } from "@/config/env";
import { LEGACY_COLLECTIONS } from "@/constants/legacyCollections";

const apply = process.argv.includes("--apply");

async function run() {
  mongoose.set("autoCreate", false);
  mongoose.set("autoIndex", false);
  await mongoose.connect(env.mongoUri);

  const users = mongoose.connection.db!.collection(LEGACY_COLLECTIONS.users);
  const filter = { projectIds: { $exists: true } };
  const affectedUsers = await users.countDocuments(filter);

  if (!apply) {
    console.log(JSON.stringify({
      dryRun: true,
      database: mongoose.connection.db!.databaseName,
      collection: LEGACY_COLLECTIONS.users,
      affectedUsers,
      nextStep: "Re-run with --apply after backing up and deploying the normalized membership code.",
    }, null, 2));
    return;
  }

  const result = await users.updateMany(filter, { $unset: { projectIds: "" } });
  console.log(JSON.stringify({
    dryRun: false,
    database: mongoose.connection.db!.databaseName,
    collection: LEGACY_COLLECTIONS.users,
    matchedUsers: result.matchedCount,
    modifiedUsers: result.modifiedCount,
  }, null, 2));
}

run()
  .catch((error) => {
    console.error("User projectIds cleanup failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
