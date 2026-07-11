import crypto from "node:crypto";
import { env } from "@/config/env";

export type EncryptedSecret = { ciphertext: string; iv: string; tag: string };
const key = crypto.createHash("sha256").update(env.credentialEncryptionKey).digest();

export function encryptSecret(value: string): EncryptedSecret {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return { ciphertext: ciphertext.toString("base64"), iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64") };
}
