import { NextResponse } from "next/server";
import { getUsersCollection } from "@/lib/db/collections";
import { encryptApiKey, validateAnthropicApiKey } from "@/lib/encryption";
import { createLogger } from "@/lib/logging";
import { getAuthenticatedUser } from "@/lib/auth/get-authenticated-user";

export async function POST(request: Request) {
  const authResult = await getAuthenticatedUser();
  if (authResult.error) return authResult.error;
  const { user } = authResult;
  const log = createLogger({ route: "settings-api-key", userId: user.clerkId });

  const body = await request.json();
  const { apiKey } = body;

  if (!apiKey || !apiKey.startsWith("sk-ant-")) {
    log.warn("Invalid API key format");
    return NextResponse.json(
      { error: "Invalid API key format" },
      { status: 400 }
    );
  }

  log.info("Validating API key with Anthropic");
  const validation = await validateAnthropicApiKey(apiKey);
  if (!validation.valid) {
    log.warn({ error: validation.error }, "API key validation failed");
    return NextResponse.json(
      { error: validation.error || "API key validation failed" },
      { status: 400 }
    );
  }

  const encrypted = encryptApiKey(apiKey);

  const users = await getUsersCollection();
  await users.updateOne(
    { _id: user._id },
    {
      $set: {
        apiKey: {
          ...encrypted,
          isValid: true,
        },
        updatedAt: new Date(),
      },
    }
  );

  log.info("API key updated successfully");

  return NextResponse.json({ success: true });
}

export async function DELETE() {
  const authResult = await getAuthenticatedUser();
  if (authResult.error) return authResult.error;
  const { user } = authResult;
  const log = createLogger({ route: "settings-api-key-delete", userId: user.clerkId });

  const users = await getUsersCollection();
  await users.updateOne(
    { _id: user._id },
    {
      $unset: { apiKey: "" },
      $set: { updatedAt: new Date() },
    }
  );

  log.info("API key deleted successfully");

  return NextResponse.json({ success: true });
}
