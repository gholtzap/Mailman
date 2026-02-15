import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getProcessedPapersCollection, getFoldersCollection } from "@/lib/db/collections";
import { getAuthenticatedUser } from "@/lib/auth/get-authenticated-user";
import { parseRequestBody } from "@/lib/validation/parse-request";
import { paperFolderSchema } from "@/lib/validation/schemas/papers";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await getAuthenticatedUser();
  if (authResult.error) return authResult.error;
  const { user } = authResult;

  const { id } = await params;

  const parsed = await parseRequestBody(request, paperFolderSchema);
  if (parsed.error) return parsed.error;
  const { folderId } = parsed.data;

  if (folderId !== null && folderId !== undefined) {
    const folders = await getFoldersCollection();
    const folder = await folders.findOne({ _id: new ObjectId(folderId), userId: user._id });
    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }
  }

  const processedPapers = await getProcessedPapersCollection();

  const update = folderId
    ? { $set: { folderId: new ObjectId(folderId), updatedAt: new Date() } }
    : { $unset: { folderId: "" }, $set: { updatedAt: new Date() } };

  const result = await processedPapers.findOneAndUpdate(
    { _id: new ObjectId(id), userId: user._id },
    update as any,
    { returnDocument: "after" }
  );

  if (!result) {
    return NextResponse.json({ error: "Paper not found" }, { status: 404 });
  }

  return NextResponse.json({ paper: result });
}
