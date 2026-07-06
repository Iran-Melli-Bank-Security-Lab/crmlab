import mongoose from "mongoose";
import { connectDB } from "@/db/connect";
import { seedOwaspWstgWebCatalog } from "./owaspWstg.seed";

const securityStandardSeeders = {
  "owasp-wstg": seedOwaspWstgWebCatalog,
} as const;

type SecurityStandardSeedKey = keyof typeof securityStandardSeeders;

async function seedSecurityStandards() {
  const requestedKeys = process.argv.slice(2);
  const seedKeys = requestedKeys.length
    ? requestedKeys
    : Object.keys(securityStandardSeeders);

  const unknownKeys = seedKeys.filter((key) => !(key in securityStandardSeeders));
  if (unknownKeys.length) {
    throw new Error(
      `Unknown security standard seed: ${unknownKeys.join(", ")}. Available: ${Object.keys(
        securityStandardSeeders
      ).join(", ")}`
    );
  }

  await connectDB();
  try {
    for (const key of seedKeys as SecurityStandardSeedKey[]) {
      const standard = await securityStandardSeeders[key]();
      console.log(
        `Seeded ${standard.standardKey} ${standard.version} (${standard.nodes.length} root nodes)`
      );
    }
  } finally {
    await mongoose.disconnect();
  }
}

seedSecurityStandards().catch((error) => {
  console.error("Security standards seed failed", error);
  process.exitCode = 1;
});
