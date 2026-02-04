import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getUsersCollection, getProcessedPapersCollection, getFoldersCollection } from "@/lib/db/collections";

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
  const { folderId } = body;

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
