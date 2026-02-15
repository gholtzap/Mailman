import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getFoldersCollection, getProcessedPapersCollection } from "@/lib/db/collections";
import { FOLDER_COLORS } from "@/lib/constants/folder-colors";
import { getAuthenticatedUser } from "@/lib/auth/get-authenticated-user";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await getAuthenticatedUser();
  if (result.error) return result.error;
  const { user } = result;

  const { id } = await params;

  const folders = await getFoldersCollection();
  const folder = await folders.findOne({ _id: new ObjectId(id), userId: user._id });
  if (!folder) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }

  return NextResponse.json({ folder });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await getAuthenticatedUser();
  if (authResult.error) return authResult.error;
  const { user } = authResult;

  const { id } = await params;

  const body = await request.json();
  const { name, color } = body;

  const updates: Record<string, any> = { updatedAt: new Date() };

  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Folder name cannot be empty" }, { status: 400 });
    }
    updates.name = name.trim();
  }

  if (color !== undefined) {
    if (!FOLDER_COLORS.includes(color)) {
      return NextResponse.json({ error: "Invalid color" }, { status: 400 });
    }
    updates.color = color;
  }

  const folders = await getFoldersCollection();
  const result = await folders.findOneAndUpdate(
    { _id: new ObjectId(id), userId: user._id },
    { $set: updates },
    { returnDocument: "after" }
  );

  if (!result) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }

  return NextResponse.json({ folder: result });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await getAuthenticatedUser();
  if (result.error) return result.error;
  const { user } = result;

  const { id } = await params;

  const folders = await getFoldersCollection();
  const folder = await folders.findOne({ _id: new ObjectId(id), userId: user._id });
  if (!folder) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }

  const processedPapers = await getProcessedPapersCollection();
  await processedPapers.updateMany(
    { userId: user._id, folderId: new ObjectId(id) },
    { $unset: { folderId: "" } }
  );

  await folders.deleteOne({ _id: new ObjectId(id), userId: user._id });

  return NextResponse.json({ success: true });
}
