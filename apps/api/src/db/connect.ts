import mongoose from "mongoose";
import { env } from "@/config/env";
import { validateLegacyCollections } from "./legacyCompatibility";

export async function connectDB() {
  mongoose.set("strictQuery", true);
  mongoose.set("autoCreate", false);
  mongoose.set("autoIndex", false);
  await mongoose.connect(env.mongoUri);
  await validateLegacyCollections();
  console.log("MongoDB connected");
}
