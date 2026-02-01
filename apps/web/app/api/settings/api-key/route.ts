import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getUsersCollection } from "@/lib/db/collections";
import { encryptApiKey, validateAnthropicApiKey } from "@/lib/encryption";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { apiKey } = body;

  if (!apiKey || !apiKey.startsWith("sk-ant-")) {
    return NextResponse.json(
      { error: "Invalid API key format" },
      { status: 400 }
    );
  }

  const validation = await validateAnthropicApiKey(apiKey);
  if (!validation.valid) {
    return NextResponse.json(
      { error: validation.error || "API key validation failed" },
      { status: 400 }
    );
  }

  const encrypted = encryptApiKey(apiKey);

  const users = await getUsersCollection();
  await users.updateOne(
    { clerkId: userId },
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

  return NextResponse.json({ success: true });
}

export async function DELETE() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await getUsersCollection();
  await users.updateOne(
    { clerkId: userId },
    {
      $unset: { apiKey: "" },
      $set: { updatedAt: new Date() },
    }
  );

  return NextResponse.json({ success: true });
}
