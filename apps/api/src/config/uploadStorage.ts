import { constants } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { env } from "@/config/env";

export const uploadDir = env.uploadDir;
export const pocUploadDir = env.pocUploadDir;

export function resolveUploadFile(filename: string) {
  return path.join(uploadDir, filename);
}

export function safePocBugTitle(value: unknown) {
  if (typeof value !== "string") return undefined;
  const title = value.trim();
  if (
    !title ||
    title.length > 180 ||
    title === "." ||
    title === ".." ||
    title.includes("/") ||
    title.includes("\\") ||
    Array.from(title).some((character) => {
      const code = character.charCodeAt(0);
      return code <= 31 || code === 127;
    })
  ) {
    return undefined;
  }
  return title;
}

export function resolvePocUploadFile(projectId: string, bugTitle: string, filename: string) {
  return path.join(pocUploadDir, projectId, bugTitle, filename);
}

export async function initializeUploadStorage() {
  try {
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.mkdir(pocUploadDir, { recursive: true, mode: 0o750 });
    await fs.access(uploadDir, constants.W_OK | constants.X_OK);
    await fs.access(pocUploadDir, constants.W_OK | constants.X_OK);
  } catch (error) {
    throw new Error(
      `Upload directory is not writable: ${uploadDir}`,
      { cause: error }
    );
  }

  console.log(`Upload storage ready at ${uploadDir}`);
}
