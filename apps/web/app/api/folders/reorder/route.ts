import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getUsersCollection, getFoldersCollection } from "@/lib/db/collections";

export async function PUT(request: Request) {
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
  const { order } = body;

  if (!Array.isArray(order) || !order.every((id: any) => typeof id === "string")) {
    return NextResponse.json({ error: "order must be an array of folder ID strings" }, { status: 400 });
  }

  const folders = await getFoldersCollection();

  const operations = order.map((id: string, index: number) => ({
    updateOne: {
      filter: { _id: new ObjectId(id), userId: user._id },
      update: { $set: { order: index, updatedAt: new Date() } },
    },
  }));

  await folders.bulkWrite(operations);

  return NextResponse.json({ success: true });
}
