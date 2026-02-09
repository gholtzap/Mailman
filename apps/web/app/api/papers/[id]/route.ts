import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getUsersCollection, getProcessedPapersCollection, getPapersCollection } from "@/lib/db/collections";

export async function GET(
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

  const processedPapers = await getProcessedPapersCollection();
  const processedPaper = await processedPapers.findOne({
    _id: new ObjectId(id),
    userId: user._id,
  });

  if (!processedPaper) {
    return NextResponse.json({ error: "Paper not found" }, { status: 404 });
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

  const processedPapers = await getProcessedPapersCollection();
  const result = await processedPapers.findOneAndDelete({
    _id: new ObjectId(id),
    userId: user._id,
  });

  if (!result) {
    return NextResponse.json({ error: "Paper not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
