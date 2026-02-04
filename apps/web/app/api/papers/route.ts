import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getUsersCollection, getProcessedPapersCollection, getPapersCollection } from "@/lib/db/collections";

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await getUsersCollection();
  const user = await users.findOne({ clerkId: userId });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const category = searchParams.get("category");
  const folderId = searchParams.get("folderId");
  const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 200);
  const offset = parseInt(searchParams.get("offset") || "0");

  const processedPapers = await getProcessedPapersCollection();
  const papers = await getPapersCollection();

  const query: any = { userId: user._id };
  if (status) {
    query.status = status;
  }
  if (folderId === "unfiled") {
    query.folderId = { $exists: false };
  } else if (folderId) {
    query.folderId = new ObjectId(folderId);
  }

  const userPapers = await processedPapers
    .find(query)
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limit)
    .toArray();

  const enrichedPapers = await Promise.all(
    userPapers.map(async (processedPaper) => {
      const paper = await papers.findOne({ _id: processedPaper.paperId });
      return {
        ...processedPaper,
        paper,
      };
    })
  );

  const filtered = category
    ? enrichedPapers.filter((p) => p.paper?.categories?.includes(category))
    : enrichedPapers;

  return NextResponse.json({ papers: filtered });
}
