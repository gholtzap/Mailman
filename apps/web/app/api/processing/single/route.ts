import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getUsersCollection, getPapersCollection, getProcessedPapersCollection, getProcessingJobsCollection } from "@/lib/db/collections";
import { paperProcessingQueue } from "@/lib/queue";

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

    console.log('[Processing API] Checking for existing processed paper...');
    const processedPapers = await getProcessedPapersCollection();
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
      } else {
        console.log('[Processing API] Paper exists but is failed/pending, will reprocess. Updating status to pending...');
        await processedPapers.updateOne(
          { _id: existing._id },
          {
            $set: {
              status: 'pending',
              updatedAt: new Date(),
              error: undefined
            }
          }
        );
      }
    }

    let processedPaperId: string;

    if (existing && existing.status !== 'completed' && existing.status !== 'processing') {
      console.log('[Processing API] Reusing existing processed paper record:', existing._id);
      processedPaperId = existing._id.toString();
    } else {
      console.log('[Processing API] Creating processed paper record...');
      const processedPaper = await processedPapers.insertOne({
        userId: user._id!,
        paperId: paper._id!,
        arxivId: paper.arxivId,
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log('[Processing API] Processed paper created:', processedPaper.insertedId);
      processedPaperId = processedPaper.insertedId.toString();
    }

    console.log('[Processing API] Creating job record...');
    const jobs = await getProcessingJobsCollection();
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
    });
    console.log('[Processing API] Job created:', job.insertedId);

    console.log('[Processing API] Adding job to queue...');
    await paperProcessingQueue.add("process-single-paper", {
      userId: userId,
      paperId: paperId,
      arxivId: paper.arxivId,
      encryptedApiKey: user.apiKey,
      jobId: job.insertedId.toString(),
      processedPaperId: processedPaperId,
    });
    console.log('[Processing API] Job added to queue successfully');

    return NextResponse.json({ success: true, jobId: job.insertedId });
  } catch (error) {
    console.error('[Processing API] ERROR:', error);
    return NextResponse.json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
