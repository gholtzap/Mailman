import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getProcessedPapersCollection, getFoldersCollection } from "@/lib/db/collections";
import { getAuthenticatedUser } from "@/lib/auth/get-authenticated-user";
import { parseRequestBody } from "@/lib/validation/parse-request";
import { parseRouteParams } from "@/lib/validation/parse-route-params";
import { paperFolderSchema } from "@/lib/validation/schemas/papers";
import { apiError } from "@/lib/api/errors";
import { checkRateLimit } from "@/lib/rate-limit";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await getAuthenticatedUser();
  if (authResult.error) return authResult.error;
  const { user } = authResult;

  const rateLimited = await checkRateLimit(user.clerkId, "write");
  if (rateLimited) return rateLimited;

  const paramsParsed = await parseRouteParams(params);
  if (paramsParsed.error) return paramsParsed.error;

  const parsed = await parseRequestBody(request, paperFolderSchema);
  if (parsed.error) return parsed.error;
  const { folderId } = parsed.data;

  if (folderId !== null && folderId !== undefined) {
    const folders = await getFoldersCollection();
    const folder = await folders.findOne({ _id: new ObjectId(folderId), userId: user._id });
    if (!folder) {
      return apiError("Folder not found", 404);
    }
  }

  const processedPapers = await getProcessedPapersCollection();

  const update = folderId
    ? { $set: { folderId: new ObjectId(folderId), updatedAt: new Date() } }
    : { $unset: { folderId: "" }, $set: { updatedAt: new Date() } };

  const result = await processedPapers.findOneAndUpdate(
    { _id: paramsParsed.id, userId: user._id },
    update as any,
    { returnDocument: "after" }
  );

  if (!result) {
    return apiError("Paper not found", 404);
  }

  return NextResponse.json({ paper: result });
}
