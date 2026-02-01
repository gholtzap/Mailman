import CryptoJS from "crypto-js";

if (!process.env.API_KEY_ENCRYPTION_SECRET) {
  throw new Error("API_KEY_ENCRYPTION_SECRET must be set in environment");
}

const SECRET = process.env.API_KEY_ENCRYPTION_SECRET;

export interface EncryptedData {
  encryptedValue: string;
  iv: string;
  authTag: string;
}

export function encryptApiKey(apiKey: string): EncryptedData {
  const iv = CryptoJS.lib.WordArray.random(16);

  const secretWordArray = CryptoJS.enc.Utf8.parse(SECRET);
  const m1 = CryptoJS.MD5(secretWordArray);
  const m1PlusSecret = CryptoJS.lib.WordArray.create()
    .concat(m1)
    .concat(secretWordArray);
  const m2 = CryptoJS.MD5(m1PlusSecret);
  const key = CryptoJS.lib.WordArray.create().concat(m1).concat(m2);

  const encrypted = CryptoJS.AES.encrypt(apiKey, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  return {
    encryptedValue: encrypted.ciphertext.toString(CryptoJS.enc.Base64),
    iv: iv.toString(CryptoJS.enc.Base64),
    authTag: "",
  };
}

export function decryptApiKey(encryptedData: EncryptedData): string {
  const iv = CryptoJS.enc.Base64.parse(encryptedData.iv);
  const ciphertext = CryptoJS.enc.Base64.parse(encryptedData.encryptedValue);

  const secretWordArray = CryptoJS.enc.Utf8.parse(SECRET);
  const m1 = CryptoJS.MD5(secretWordArray);
  const m1PlusSecret = CryptoJS.lib.WordArray.create()
    .concat(m1)
    .concat(secretWordArray);
  const m2 = CryptoJS.MD5(m1PlusSecret);
  const key = CryptoJS.lib.WordArray.create().concat(m1).concat(m2);

  const decrypted = CryptoJS.AES.decrypt(
    { ciphertext: ciphertext } as any,
    key,
    {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    }
  );

  return decrypted.toString(CryptoJS.enc.Utf8);
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
        model: "claude-3-5-sonnet-20241022",
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
