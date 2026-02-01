import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
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

  const processedPapers = await getProcessedPapersCollection();
  const papers = await getPapersCollection();

  const query: any = { userId: user._id };
  if (status) {
    query.status = status;
  }

  const userPapers = await processedPapers
    .find(query)
    .sort({ createdAt: -1 })
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
