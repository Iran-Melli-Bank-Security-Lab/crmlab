import { constants } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { env } from "@/config/env";

export const uploadDir = env.uploadDir;

export function resolveUploadFile(filename: string) {
  return path.join(uploadDir, filename);
}

export async function initializeUploadStorage() {
  try {
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.access(uploadDir, constants.W_OK | constants.X_OK);
  } catch (error) {
    throw new Error(
      `Upload directory is not writable: ${uploadDir}`,
      { cause: error }
    );
  }

  console.log(`Upload storage ready at ${uploadDir}`);
}
