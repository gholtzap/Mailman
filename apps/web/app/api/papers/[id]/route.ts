import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getProcessedPapersCollection, getPapersCollection } from "@/lib/db/collections";
import { getAuthenticatedUser } from "@/lib/auth/get-authenticated-user";
import { apiError } from "@/lib/api/errors";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await getAuthenticatedUser();
  if (result.error) return result.error;
  const { user } = result;

  const { id } = await params;

  const processedPapers = await getProcessedPapersCollection();
  const processedPaper = await processedPapers.findOne({
    _id: new ObjectId(id),
    userId: user._id,
  });

  if (!processedPaper) {
    return apiError("Paper not found", 404);
  }

  const papers = await getPapersCollection();
  const paper = await papers.findOne({ _id: processedPaper.paperId });

  return NextResponse.json({
    processedPaper,
    paper,
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await getAuthenticatedUser();
  if (authResult.error) return authResult.error;
  const { user } = authResult;

  const { id } = await params;

  const processedPapers = await getProcessedPapersCollection();
  const result = await processedPapers.findOneAndDelete({
    _id: new ObjectId(id),
    userId: user._id,
  });

  if (!result) {
    return apiError("Paper not found", 404);
  }

  return NextResponse.json({ success: true });
}
