import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getUsersCollection } from "@/lib/db/collections";
import { parseRequestBody } from "@/lib/validation/parse-request";
import { settingsUpdateSchema } from "@/lib/validation/schemas/settings";
import { apiError } from "@/lib/api/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { fetchSettings } from "@/lib/data/settings";
import { findOrCreateUser } from "@/lib/db/find-or-create-user";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return apiError("Unauthorized", 401);
  }

  const rateLimited = await checkRateLimit(userId, "read");
  if (rateLimited) return rateLimited;

  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses[0]?.emailAddress || "";

  const user = await findOrCreateUser(userId, email);
  if (!user) {
    return apiError("Failed to create user", 500);
  }

  return NextResponse.json(fetchSettings(user));
}

export async function PUT(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return apiError("Unauthorized", 401);
  }

  const rateLimited = await checkRateLimit(userId, "write");
  if (rateLimited) return rateLimited;

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
