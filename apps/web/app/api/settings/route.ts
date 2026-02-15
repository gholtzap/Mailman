import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getUsersCollection } from "@/lib/db/collections";
import { parseRequestBody } from "@/lib/validation/parse-request";
import { settingsUpdateSchema } from "@/lib/validation/schemas/settings";

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
    email: user.email || "",
    settings: {
      ...user.settings,
      keywords: user.settings.keywords || [],
      keywordMatchMode: user.settings.keywordMatchMode || "any",
    },
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

  const parsed = await parseRequestBody(request, settingsUpdateSchema);
  if (parsed.error) return parsed.error;
  const { defaultCategories, maxPagesPerPaper, papersPerCategory, keywords, keywordMatchMode, email } = parsed.data;

  const users = await getUsersCollection();
  const updateFields: any = {
    "settings.defaultCategories": defaultCategories,
    "settings.maxPagesPerPaper": maxPagesPerPaper,
    "settings.papersPerCategory": papersPerCategory,
    updatedAt: new Date(),
  };

  if (keywords !== undefined) {
    updateFields["settings.keywords"] = keywords;
  }

  if (keywordMatchMode !== undefined) {
    updateFields["settings.keywordMatchMode"] = keywordMatchMode;
  }

  if (email !== undefined) {
    updateFields.email = email;
  }

  await users.updateOne(
    { clerkId: userId },
    { $set: updateFields }
  );

  return NextResponse.json({ success: true });
}
