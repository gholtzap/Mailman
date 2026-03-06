import { NextResponse } from "next/server";
import { getFoldersCollection } from "@/lib/db/collections";
import { FOLDER_COLORS, DEFAULT_FOLDER_COLOR } from "@/lib/constants/folder-colors";
import { getAuthenticatedUser } from "@/lib/auth/get-authenticated-user";
import { parseRequestBody } from "@/lib/validation/parse-request";
import { folderCreateSchema } from "@/lib/validation/schemas/folders";
import { apiError } from "@/lib/api/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { fetchFolders } from "@/lib/data/folders";

export async function GET() {
  const result = await getAuthenticatedUser();
  if (result.error) return result.error;
  const { user } = result;

  const rateLimited = await checkRateLimit(user.clerkId, "read");
  if (rateLimited) return rateLimited;

  const data = await fetchFolders(user);

  return NextResponse.json(data);
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

    const maxOrderResult = await folders
      .find({ userId: user._id })
      .sort({ order: -1 })
      .limit(1)
      .toArray();
    const nextOrder = maxOrderResult.length > 0 ? maxOrderResult[0].order + 1 : 0;

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
