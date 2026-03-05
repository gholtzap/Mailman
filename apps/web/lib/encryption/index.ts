import crypto from "crypto";
import { ObjectId } from "mongodb";
import { getUsersCollection } from "@/lib/db/collections";

if (!process.env.API_KEY_ENCRYPTION_SECRET) {
  throw new Error("API_KEY_ENCRYPTION_SECRET must be set in environment");
}

const SECRET = process.env.API_KEY_ENCRYPTION_SECRET;

export interface EncryptedData {
  encryptedValue: string;
  iv: string;
  authTag: string;
  salt?: string;
}

export function encryptApiKey(apiKey: string): EncryptedData {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(SECRET, salt, 32);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([
    cipher.update(apiKey, "utf8"),
    cipher.final(),
  ]);

  return {
    encryptedValue: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
    salt: salt.toString("base64"),
  };
}

function legacyDeriveKey(secret: string): { key: Buffer; } {
  const secretBytes = Buffer.from(secret, "utf8");
  const m1 = crypto.createHash("md5").update(secretBytes).digest();
  const m2 = crypto.createHash("md5").update(Buffer.concat([m1, secretBytes])).digest();
  return { key: Buffer.concat([m1, m2]) };
}

export function decryptApiKey(encryptedData: EncryptedData): string {
  if (!encryptedData.authTag) {
    const { key } = legacyDeriveKey(SECRET);
    const iv = Buffer.from(encryptedData.iv, "base64");
    const ciphertext = Buffer.from(encryptedData.encryptedValue, "base64");
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  }

  const salt = Buffer.from(encryptedData.salt!, "base64");
  const key = crypto.scryptSync(SECRET, salt, 32);
  const iv = Buffer.from(encryptedData.iv, "base64");
  const authTag = Buffer.from(encryptedData.authTag, "base64");
  const ciphertext = Buffer.from(encryptedData.encryptedValue, "base64");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

export async function migrateApiKeyIfLegacy(
  userId: ObjectId,
  encryptedData: EncryptedData
): Promise<EncryptedData> {
  if (encryptedData.authTag) {
    return encryptedData;
  }

  const plaintext = decryptApiKey(encryptedData);
  const newEncrypted = encryptApiKey(plaintext);

  const users = await getUsersCollection();
  users
    .updateOne(
      { _id: userId },
      {
        $set: {
          "apiKey.encryptedValue": newEncrypted.encryptedValue,
          "apiKey.iv": newEncrypted.iv,
          "apiKey.authTag": newEncrypted.authTag,
          "apiKey.salt": newEncrypted.salt,
          updatedAt: new Date(),
        },
      }
    )
    .catch((err) => {
      console.error("Failed to migrate legacy API key:", err);
    });

  return newEncrypted;
}

export async function validateAnthropicApiKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 10,
        messages: [{ role: "user", content: "test" }],
      }),
    });

    if (response.status === 401 || response.status === 403) {
      return { valid: false, error: "Invalid API key" };
    }

    if (response.status === 200 || response.status === 400) {
      return { valid: true };
    }

    const errorText = await response.text();
    console.error("Unexpected API response:", response.status, errorText);
    return { valid: true };
  } catch (error) {
    console.error("API key validation error:", error);
    return { valid: true };
  }
}
