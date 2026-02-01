import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getUsersCollection, getPapersCollection, getProcessedPapersCollection, getProcessingJobsCollection } from "@/lib/db/collections";
import { paperProcessingQueue } from "@/lib/queue";
import { getClient } from "@/lib/db/mongodb";

export async function POST(request: Request) {
  try {
    console.log('[Processing API] Starting single paper processing request');

    const { userId } = await auth();
    if (!userId) {
      console.log('[Processing API] Unauthorized - no userId');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.log('[Processing API] User authenticated:', userId);

    const body = await request.json();
    const { paperId } = body;
    console.log('[Processing API] Paper ID:', paperId);

    console.log('[Processing API] Fetching user from database...');
    const users = await getUsersCollection();
    const user = await users.findOne({ clerkId: userId });

    if (!user) {
      console.log('[Processing API] User not found in database');
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    console.log('[Processing API] User found:', user._id);

    if (!user.apiKey) {
      console.log('[Processing API] User has no API key configured');
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 400 }
      );
    }
    console.log('[Processing API] User has API key configured');

    console.log('[Processing API] Fetching paper from database...');
    const papers = await getPapersCollection();
    const paper = await papers.findOne({ _id: new ObjectId(paperId) });

    if (!paper) {
      console.log('[Processing API] Paper not found:', paperId);
      return NextResponse.json({ error: "Paper not found" }, { status: 404 });
    }
    console.log('[Processing API] Paper found:', paper.arxivId);

    const processedPapers = await getProcessedPapersCollection();

    console.log('[Processing API] Checking for existing processed paper...');
    const existing = await processedPapers.findOne({
      userId: user._id,
      paperId: paper._id,
    });

    if (existing) {
      if (existing.status === 'completed') {
        console.log('[Processing API] Paper already completed, returning existing');
        return NextResponse.json({ processedPaper: existing });
      } else if (existing.status === 'processing') {
        console.log('[Processing API] Paper is currently processing, returning existing');
        return NextResponse.json({ processedPaper: existing });
      }
      console.log('[Processing API] Paper exists but is failed/pending, will reprocess');
    }

    const client = await getClient();
    const session = client.startSession();

    let processedPaperId!: string;
    let jobId!: ObjectId;

    try {
      await session.withTransaction(async () => {
        const jobs = await getProcessingJobsCollection();

        if (existing) {
          console.log('[Processing API] Updating existing processed paper to pending...');
          await processedPapers.updateOne(
            { _id: existing._id },
            {
              $set: {
                status: 'pending',
                updatedAt: new Date(),
                error: undefined
              }
            },
            { session }
          );
          processedPaperId = existing._id.toString();
        } else {
          console.log('[Processing API] Creating new processed paper record...');
          const processedPaper = await processedPapers.insertOne({
            userId: user._id!,
            paperId: paper._id!,
            arxivId: paper.arxivId,
            status: "pending",
            createdAt: new Date(),
            updatedAt: new Date(),
          }, { session });
          console.log('[Processing API] Processed paper created:', processedPaper.insertedId);
          processedPaperId = processedPaper.insertedId.toString();
        }

        console.log('[Processing API] Creating job record...');
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
        console.log('[Processing API] Job created:', job.insertedId);
        jobId = job.insertedId;
      });
    } finally {
      await session.endSession();
    }

    console.log('[Processing API] Adding job to queue...');
    await paperProcessingQueue.add("process-single-paper", {
      userId: userId,
      paperId: paperId,
      arxivId: paper.arxivId,
      encryptedApiKey: user.apiKey,
      jobId: jobId.toString(),
      processedPaperId: processedPaperId,
    });
    console.log('[Processing API] Job added to queue successfully');

    return NextResponse.json({ success: true, jobId: jobId });
  } catch (error) {
    console.error('[Processing API] ERROR:', error);
    return NextResponse.json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
