import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getUsersCollection } from "@/lib/db/collections";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await getUsersCollection();
  let user = await users.findOne({ clerkId: userId });

  if (!user) {
    const clerkUser = await currentUser();
    const email = clerkUser?.emailAddresses[0]?.emailAddress || "";

    const result = await users.insertOne({
      clerkId: userId,
      email,
      settings: {
        defaultCategories: ["cs.AI", "cs.LG"],
        maxPagesPerPaper: 50,
        papersPerCategory: 5,
      },
      usage: {
        currentMonthPapersProcessed: 0,
        lastResetDate: new Date(),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    user = await users.findOne({ _id: result.insertedId });
    if (!user) {
      return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
    }
  }

  return NextResponse.json({
    settings: user.settings,
    hasApiKey: !!user.apiKey?.encryptedValue,
    apiKeyValid: user.apiKey?.isValid ?? false,
    usage: user.usage,
  });
}

export async function PUT(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { defaultCategories, maxPagesPerPaper, papersPerCategory } = body;

  const users = await getUsersCollection();
  await users.updateOne(
    { clerkId: userId },
    {
      $set: {
        "settings.defaultCategories": defaultCategories,
        "settings.maxPagesPerPaper": maxPagesPerPaper,
        "settings.papersPerCategory": papersPerCategory,
        updatedAt: new Date(),
      },
    }
  );

  return NextResponse.json({ success: true });
}
