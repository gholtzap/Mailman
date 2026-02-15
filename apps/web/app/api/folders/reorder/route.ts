import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getFoldersCollection } from "@/lib/db/collections";
import { getAuthenticatedUser } from "@/lib/auth/get-authenticated-user";

export async function PUT(request: Request) {
  const result = await getAuthenticatedUser();
  if (result.error) return result.error;
  const { user } = result;

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
