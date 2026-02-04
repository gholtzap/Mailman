import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getUsersCollection, getFoldersCollection } from "@/lib/db/collections";
import { FOLDER_COLORS, DEFAULT_FOLDER_COLOR } from "@/lib/constants/folder-colors";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await getUsersCollection();
  const user = await users.findOne({ clerkId: userId });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

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
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const users = await getUsersCollection();
    const user = await users.findOne({ clerkId: userId });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, color } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Folder name is required" }, { status: 400 });
    }

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
      return NextResponse.json({ error: "A folder with this name already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
