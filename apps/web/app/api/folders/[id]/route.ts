import { NextResponse } from "next/server";
import { getFoldersCollection, getProcessedPapersCollection } from "@/lib/db/collections";
import { getAuthenticatedUser } from "@/lib/auth/get-authenticated-user";
import { parseRequestBody } from "@/lib/validation/parse-request";
import { parseRouteParams } from "@/lib/validation/parse-route-params";
import { folderUpdateSchema } from "@/lib/validation/schemas/folders";
import { apiError } from "@/lib/api/errors";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await getAuthenticatedUser();
  if (result.error) return result.error;
  const { user } = result;

  const parsed = await parseRouteParams(params);
  if (parsed.error) return parsed.error;

  const folders = await getFoldersCollection();
  const folder = await folders.findOne({ _id: parsed.id, userId: user._id });
  if (!folder) {
    return apiError("Folder not found", 404);
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

  const paramsParsed = await parseRouteParams(params);
  if (paramsParsed.error) return paramsParsed.error;

  const parsed = await parseRequestBody(request, folderUpdateSchema);
  if (parsed.error) return parsed.error;
  const { name, color } = parsed.data;

  const updates: Record<string, any> = { updatedAt: new Date() };

  if (name !== undefined) {
    updates.name = name.trim();
  }

  if (color !== undefined) {
    updates.color = color;
  }

  const folders = await getFoldersCollection();
  const result = await folders.findOneAndUpdate(
    { _id: paramsParsed.id, userId: user._id },
    { $set: updates },
    { returnDocument: "after" }
  );

  if (!result) {
    return apiError("Folder not found", 404);
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

  const parsed = await parseRouteParams(params);
  if (parsed.error) return parsed.error;

  const folders = await getFoldersCollection();
  const folder = await folders.findOne({ _id: parsed.id, userId: user._id });
  if (!folder) {
    return apiError("Folder not found", 404);
  }

  const processedPapers = await getProcessedPapersCollection();
  await processedPapers.updateMany(
    { userId: user._id, folderId: parsed.id },
    { $unset: { folderId: "" } }
  );

  await folders.deleteOne({ _id: parsed.id, userId: user._id });

  return NextResponse.json({ success: true });
}
