import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getUsersCollection, getFoldersCollection, getProcessedPapersCollection } from "@/lib/db/collections";
import { FOLDER_COLORS } from "@/lib/constants/folder-colors";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const users = await getUsersCollection();
  const user = await users.findOne({ clerkId: userId });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

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
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const users = await getUsersCollection();
  const user = await users.findOne({ clerkId: userId });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

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
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const users = await getUsersCollection();
  const user = await users.findOne({ clerkId: userId });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

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
