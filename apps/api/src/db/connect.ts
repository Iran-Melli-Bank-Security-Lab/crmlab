import mongoose from "mongoose";
import { env } from "@/config/env";
import { validateLegacyCollections } from "./legacyCompatibility";

export async function connectDB() {
  mongoose.set("strictQuery", true);
  mongoose.set("autoCreate", false);
  mongoose.set("autoIndex", false);
  await mongoose.connect(env.mongoUri);

  const connectedDatabase = mongoose.connection.db?.databaseName;
  if (env.nodeEnv === "production" && connectedDatabase !== env.legacyDatabaseName) {
    await mongoose.disconnect();
    throw new Error(
      `MongoDB database mismatch: expected ${env.legacyDatabaseName}, connected to ${connectedDatabase || "unknown"}`
    );
  }

  await validateLegacyCollections();
  console.log(`MongoDB connected to database=${connectedDatabase}`);
}
