import { NextResponse } from "next/server";
import { getFoldersCollection, getCountersCollection } from "@/lib/db/collections";
import { FOLDER_COLORS, DEFAULT_FOLDER_COLOR } from "@/lib/constants/folder-colors";
import { getAuthenticatedUser } from "@/lib/auth/get-authenticated-user";
import { parseRequestBody } from "@/lib/validation/parse-request";
import { folderCreateSchema } from "@/lib/validation/schemas/folders";
import { apiError } from "@/lib/api/errors";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET() {
  const result = await getAuthenticatedUser();
  if (result.error) return result.error;
  const { user } = result;

  const rateLimited = await checkRateLimit(user.clerkId, "read");
  if (rateLimited) return rateLimited;

  const folders = await getFoldersCollection();
  const userFolders = await folders
    .find({ userId: user._id })
    .sort({ order: 1 })
    .limit(100)
    .toArray();

  return NextResponse.json({ folders: userFolders });
}

export async function POST(request: Request) {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult.error) return authResult.error;
    const { user } = authResult;

    const rateLimited = await checkRateLimit(user.clerkId, "write");
    if (rateLimited) return rateLimited;

    const parsed = await parseRequestBody(request, folderCreateSchema);
    if (parsed.error) return parsed.error;
    const { name, color } = parsed.data;

    const resolvedColor = color && FOLDER_COLORS.includes(color) ? color : DEFAULT_FOLDER_COLOR;

    const folders = await getFoldersCollection();
    const counters = await getCountersCollection();

    const counter = await counters.findOneAndUpdate(
      { userId: user._id!, scope: "folder_order" },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: "before" }
    );
    const nextOrder = counter ? counter.seq : 0;

    const now = new Date();
    const result = await folders.insertOne({
      userId: user._id!,
      name: name.trim(),
      color: resolvedColor,
      order: nextOrder,
      createdAt: now,
      updatedAt: now,
    });

    const created = await folders.findOne({ _id: result.insertedId });
    return NextResponse.json({ folder: created }, { status: 201 });
  } catch (error: any) {
    if (error.code === 11000) {
      return apiError("A folder with this name already exists", 409);
    }
    return apiError("Internal server error", 500);
  }
}
