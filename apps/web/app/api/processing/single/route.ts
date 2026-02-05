import { auth } from "@clerk/nextjs/server";
import { NextResponse, after } from "next/server";
import { ObjectId } from "mongodb";
import { getUsersCollection, getPapersCollection, getProcessedPapersCollection, getProcessingJobsCollection } from "@/lib/db/collections";
import { getClient } from "@/lib/db/mongodb";
import { createLogger } from "@/lib/logging";
import { processSinglePaper } from "@/lib/processing/single";

export const maxDuration = 300;

export async function POST(request: Request) {
  const { userId } = await auth();
  const log = createLogger({ route: "single-processing", userId: userId || "anonymous" });

  try {
    log.info("Starting single paper processing request");

    if (!userId) {
      log.warn("Unauthorized request - no userId");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { paperId } = body;
    log.debug({ paperId }, "Processing paper");

    const users = await getUsersCollection();
    const user = await users.findOne({ clerkId: userId });

    if (!user) {
      log.warn("User not found in database");
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.apiKey) {
      log.info("User has no API key - will process without AI summarization");
    }

    const papers = await getPapersCollection();
    const paper = await papers.findOne({ _id: new ObjectId(paperId) });

    if (!paper) {
      log.warn({ paperId }, "Paper not found");
      return NextResponse.json({ error: "Paper not found" }, { status: 404 });
    }
    log.debug({ arxivId: paper.arxivId }, "Paper found");

    const processedPapers = await getProcessedPapersCollection();

    const existing = await processedPapers.findOne({
      userId: user._id,
      paperId: paper._id,
    });

    if (existing) {
      if (existing.status === 'completed') {
        log.info({ processedPaperId: existing._id }, "Paper already completed");
        return NextResponse.json({ processedPaper: existing });
      } else if (existing.status === 'processing') {
        log.info({ processedPaperId: existing._id }, "Paper currently processing");
        return NextResponse.json({ processedPaper: existing });
      }
      log.info({ status: existing.status }, "Paper exists but will be reprocessed");
    }

    const client = await getClient();
    const session = client.startSession();

    let processedPaperId!: string;
    let jobId!: ObjectId;

    try {
      await session.withTransaction(async () => {
        const jobs = await getProcessingJobsCollection();

        if (existing) {
          await processedPapers.updateOne(
            { _id: existing._id },
            {
              $set: {
                status: 'pending',
                updatedAt: new Date()
              },
              $unset: {
                error: ''
              }
            },
            { session }
          );
          processedPaperId = existing._id.toString();
          log.debug({ processedPaperId }, "Updated existing processed paper to pending");
        } else {
          const processedPaper = await processedPapers.insertOne({
            userId: user._id!,
            paperId: paper._id!,
            arxivId: paper.arxivId,
            status: "pending",
            createdAt: new Date(),
            updatedAt: new Date(),
          }, { session });
          processedPaperId = processedPaper.insertedId.toString();
          log.debug({ processedPaperId }, "Created new processed paper record");
        }

        const job = await jobs.insertOne({
          userId: user._id!,
          type: "single_paper",
          status: "queued",
          input: {
            arxivUrl: `https://arxiv.org/abs/${paper.arxivId}`,
          },
          progress: {
            total: 1,
            completed: 0,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        }, { session });
        jobId = job.insertedId;
        log.debug({ jobId }, "Created job record");
      });
    } finally {
      await session.endSession();
    }

    after(async () => {
      await processSinglePaper({
        processedPaperId,
        jobId: jobId.toString(),
        arxivId: paper.arxivId,
        encryptedApiKey: user.apiKey || null,
      });
    });
    log.info({ jobId }, "Processing triggered");

    return NextResponse.json({ success: true, jobId: jobId });
  } catch (error) {
    log.error({ err: error }, "Single paper processing failed");
    return NextResponse.json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
