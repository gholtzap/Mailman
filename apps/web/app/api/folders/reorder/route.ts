import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getFoldersCollection } from "@/lib/db/collections";
import { getAuthenticatedUser } from "@/lib/auth/get-authenticated-user";
import { parseRequestBody } from "@/lib/validation/parse-request";
import { folderReorderSchema } from "@/lib/validation/schemas/folders";

export async function PUT(request: Request) {
  const result = await getAuthenticatedUser();
  if (result.error) return result.error;
  const { user } = result;

  const parsed = await parseRequestBody(request, folderReorderSchema);
  if (parsed.error) return parsed.error;
  const { order } = parsed.data;

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
