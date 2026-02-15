import { NextResponse, after } from "next/server";
import { ObjectId } from "mongodb";
import { getProcessedPapersCollection, getPapersCollection, getFoldersCollection } from "@/lib/db/collections";
import { processSinglePaper } from "@/lib/processing/single";
import { getAuthenticatedUser } from "@/lib/auth/get-authenticated-user";

export const maxDuration = 300;

const MAX_BULK_RETRY = 20;

export async function POST(request: Request) {
  const result = await getAuthenticatedUser();
  if (result.error) return result.error;
  const { user } = result;

  const body = await request.json();
  const { action, paperIds, folderId } = body;

  if (!action || !Array.isArray(paperIds) || paperIds.length === 0) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const processedPapers = await getProcessedPapersCollection();
  const objectIds = paperIds.map((id: string) => new ObjectId(id));

  if (action === "delete") {
    const result = await processedPapers.deleteMany({
      _id: { $in: objectIds },
      userId: user._id,
    });

    return NextResponse.json({ deleted: result.deletedCount });
  }

  if (action === "move") {
    if (folderId !== null && folderId !== undefined) {
      const folders = await getFoldersCollection();
      const folder = await folders.findOne({ _id: new ObjectId(folderId), userId: user._id });
      if (!folder) {
        return NextResponse.json({ error: "Folder not found" }, { status: 404 });
      }
    }

    const update = folderId
      ? { $set: { folderId: new ObjectId(folderId), updatedAt: new Date() } }
      : { $unset: { folderId: "" as const }, $set: { updatedAt: new Date() } };

    const result = await processedPapers.updateMany(
      { _id: { $in: objectIds }, userId: user._id },
      update as any,
    );

    return NextResponse.json({ modified: result.modifiedCount });
  }

  if (action === "retry") {
    const limitedIds = objectIds.slice(0, MAX_BULK_RETRY);
    const papersToRetry = await processedPapers
      .find({
        _id: { $in: limitedIds },
        userId: user._id,
        status: { $in: ["failed", "pending"] },
      })
      .toArray();

    if (papersToRetry.length === 0) {
      return NextResponse.json({ retried: 0 });
    }

    const papers = await getPapersCollection();
    const paperDocs = await papers
      .find({ _id: { $in: papersToRetry.map((p) => p.paperId) } })
      .toArray();
    const paperMap = new Map(paperDocs.map((p) => [p._id.toString(), p]));

    await processedPapers.updateMany(
      { _id: { $in: papersToRetry.map((p) => p._id!) } },
      { $set: { status: "pending", updatedAt: new Date() }, $unset: { error: "" } },
    );

    after(async () => {
      for (const pp of papersToRetry) {
        const paperDoc = paperMap.get(pp.paperId.toString());
        if (!paperDoc) continue;
        await processSinglePaper({
          processedPaperId: pp._id!.toString(),
          jobId: "",
          arxivId: paperDoc.arxivId,
          encryptedApiKey: user.apiKey || null,
          skipAI: pp.skipAI || false,
        });
      }
    });

    return NextResponse.json({ retried: papersToRetry.length });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
