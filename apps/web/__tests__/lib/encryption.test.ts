import crypto from "crypto";
import { ObjectId } from "mongodb";

const mockUpdateOne = jest.fn().mockResolvedValue({ modifiedCount: 1 });
const mockGetUsersCollection = jest.fn().mockResolvedValue({ updateOne: mockUpdateOne });

jest.mock("@/lib/db/collections", () => ({
  getUsersCollection: (...args: any[]) => mockGetUsersCollection(...args),
}));

jest.unmock("@/lib/encryption");

const {
  encryptApiKey,
  decryptApiKey,
  migrateApiKeyIfLegacy,
} = jest.requireActual("../../lib/encryption/index") as typeof import("../../lib/encryption/index");

function createLegacyEncryptedData(plaintext: string): {
  encryptedValue: string;
  iv: string;
  authTag: string;
} {
  const secret = process.env.API_KEY_ENCRYPTION_SECRET!;
  const secretBytes = Buffer.from(secret, "utf8");
  const m1 = crypto.createHash("md5").update(secretBytes).digest();
  const m2 = crypto
    .createHash("md5")
    .update(Buffer.concat([m1, secretBytes]))
    .digest();
  const key = Buffer.concat([m1, m2]);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  return {
    encryptedValue: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: "",
  };
}

describe("encryption", () => {
  beforeEach(() => {
    mockUpdateOne.mockClear();
    mockGetUsersCollection.mockClear();
  });

  describe("encryptApiKey", () => {
    it("returns base64-encoded fields with non-empty authTag and salt", () => {
      const result = encryptApiKey("sk-ant-test123");

      expect(result.encryptedValue).toBeTruthy();
      expect(result.iv).toBeTruthy();
      expect(result.authTag).toBeTruthy();
      expect(result.salt).toBeTruthy();

      expect(() => Buffer.from(result.encryptedValue, "base64")).not.toThrow();
      expect(() => Buffer.from(result.iv, "base64")).not.toThrow();
      expect(() => Buffer.from(result.authTag, "base64")).not.toThrow();
      expect(() => Buffer.from(result.salt!, "base64")).not.toThrow();
    });

    it("produces different ciphertexts for the same plaintext", () => {
      const a = encryptApiKey("sk-ant-test123");
      const b = encryptApiKey("sk-ant-test123");

      expect(a.encryptedValue).not.toBe(b.encryptedValue);
      expect(a.iv).not.toBe(b.iv);
      expect(a.salt).not.toBe(b.salt);
    });

    it("uses 12-byte IV and 16-byte salt", () => {
      const result = encryptApiKey("sk-ant-test123");

      expect(Buffer.from(result.iv, "base64").length).toBe(12);
      expect(Buffer.from(result.salt!, "base64").length).toBe(16);
    });
  });

  describe("decryptApiKey", () => {
    it("round-trips with new GCM format", () => {
      const apiKey = "sk-ant-api03-abcdef1234567890";
      const encrypted = encryptApiKey(apiKey);
      const decrypted = decryptApiKey(encrypted);

      expect(decrypted).toBe(apiKey);
    });

    it("decrypts legacy CBC format with empty authTag", () => {
      const apiKey = "sk-ant-legacy-key-12345";
      const legacy = createLegacyEncryptedData(apiKey);
      const decrypted = decryptApiKey(legacy);

      expect(decrypted).toBe(apiKey);
    });

    it("handles special characters in the plaintext", () => {
      const apiKey = "sk-ant-test!@#$%^&*()_+-=[]{}|;':\",./<>?";
      const encrypted = encryptApiKey(apiKey);
      const decrypted = decryptApiKey(encrypted);

      expect(decrypted).toBe(apiKey);
    });

    it("throws on tampered ciphertext (GCM integrity)", () => {
      const encrypted = encryptApiKey("sk-ant-test123");
      const ciphertextBuf = Buffer.from(encrypted.encryptedValue, "base64");
      ciphertextBuf[0] ^= 0xff;
      encrypted.encryptedValue = ciphertextBuf.toString("base64");

      expect(() => decryptApiKey(encrypted)).toThrow();
    });

    it("throws on tampered authTag (GCM integrity)", () => {
      const encrypted = encryptApiKey("sk-ant-test123");
      const authTagBuf = Buffer.from(encrypted.authTag, "base64");
      authTagBuf[0] ^= 0xff;
      encrypted.authTag = authTagBuf.toString("base64");

      expect(() => decryptApiKey(encrypted)).toThrow();
    });
  });

  describe("migrateApiKeyIfLegacy", () => {
    it("returns new-format data unchanged without DB call", async () => {
      const encrypted = encryptApiKey("sk-ant-test123");
      const userId = new ObjectId();

      const result = await migrateApiKeyIfLegacy(userId, encrypted);

      expect(result).toBe(encrypted);
      expect(mockGetUsersCollection).not.toHaveBeenCalled();
    });

    it("re-encrypts legacy data and writes to DB", async () => {
      const apiKey = "sk-ant-legacy-migrate-test";
      const legacy = createLegacyEncryptedData(apiKey);
      const userId = new ObjectId();

      const result = await migrateApiKeyIfLegacy(userId, legacy);

      expect(result.authTag).toBeTruthy();
      expect(result.salt).toBeTruthy();
      expect(result).not.toBe(legacy);
      expect(decryptApiKey(result)).toBe(apiKey);

      expect(mockGetUsersCollection).toHaveBeenCalled();
      expect(mockUpdateOne).toHaveBeenCalledWith(
        { _id: userId },
        expect.objectContaining({
          $set: expect.objectContaining({
            "apiKey.encryptedValue": result.encryptedValue,
            "apiKey.iv": result.iv,
            "apiKey.authTag": result.authTag,
            "apiKey.salt": result.salt,
          }),
        })
      );
    });

    it("still returns re-encrypted data when DB update fails", async () => {
      mockUpdateOne.mockRejectedValueOnce(new Error("DB connection lost"));
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      const apiKey = "sk-ant-legacy-db-fail-test";
      const legacy = createLegacyEncryptedData(apiKey);
      const userId = new ObjectId();

      const result = await migrateApiKeyIfLegacy(userId, legacy);

      expect(result.authTag).toBeTruthy();
      expect(decryptApiKey(result)).toBe(apiKey);

      await new Promise((r) => setTimeout(r, 50));
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to migrate legacy API key:",
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });
});
