import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getUsersCollection, getPapersCollection, getProcessedPapersCollection, getProcessingJobsCollection } from "@/lib/db/collections";
import { paperProcessingQueue } from "@/lib/queue";
import { createLogger } from "@/lib/logging";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: Request,
  { params }: RouteParams
) {
  const { userId } = await auth();
  const log = createLogger({ route: "retry-job", userId: userId || "anonymous" });

  try {
    if (!userId) {
      log.warn("Unauthorized request");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const users = await getUsersCollection();
    const user = await users.findOne({ clerkId: userId });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { id } = await params;
    const jobs = await getProcessingJobsCollection();

    const job = await jobs.findOneAndUpdate(
      {
        _id: new ObjectId(id),
        userId: user._id,
        status: { $in: ["queued", "failed"] },
      },
      {
        $set: {
          status: "queued",
          progress: { total: 0, completed: 0 },
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" }
    );

    if (!job) {
      const existing = await jobs.findOne({ _id: new ObjectId(id) });
      if (!existing) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }
      if (existing.userId.toString() !== user._id!.toString()) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
      return NextResponse.json(
        { error: "Job cannot be retried in its current state" },
        { status: 400 }
      );
    }

    log.info({ jobId: id, jobType: job.type }, "Retrying job");

    if (job.type === "single_paper") {
      const arxivUrl = job.input.arxivUrl;
      if (!arxivUrl) {
        await jobs.updateOne(
          { _id: new ObjectId(id) },
          { $set: { status: "failed", updatedAt: new Date() } }
        );
        return NextResponse.json({ error: "Job is missing arxivUrl" }, { status: 400 });
      }

      const arxivId = arxivUrl.split("/abs/")[1];
      if (!arxivId) {
        await jobs.updateOne(
          { _id: new ObjectId(id) },
          { $set: { status: "failed", updatedAt: new Date() } }
        );
        return NextResponse.json({ error: "Could not extract arxivId from URL" }, { status: 400 });
      }

      const papers = await getPapersCollection();
      const paper = await papers.findOne({ arxivId });

      if (!paper) {
        await jobs.updateOne(
          { _id: new ObjectId(id) },
          { $set: { status: "failed", updatedAt: new Date() } }
        );
        return NextResponse.json({ error: "Paper not found" }, { status: 404 });
      }

      const processedPapers = await getProcessedPapersCollection();
      const processedPaper = await processedPapers.findOneAndUpdate(
        {
          userId: user._id,
          paperId: paper._id,
          status: { $in: ["pending", "failed"] },
        },
        {
          $set: { status: "pending", updatedAt: new Date() },
          $unset: { error: "" },
        },
        { returnDocument: "after" }
      );

      if (!processedPaper) {
        await jobs.updateOne(
          { _id: new ObjectId(id) },
          { $set: { status: "failed", updatedAt: new Date() } }
        );
        return NextResponse.json(
          { error: "Processed paper record not found or already in progress" },
          { status: 400 }
        );
      }

      await jobs.updateOne(
        { _id: new ObjectId(id) },
        { $set: { progress: { total: 1, completed: 0 } } }
      );

      await paperProcessingQueue.add("process-single-paper", {
        userId: userId,
        paperId: paper._id!.toString(),
        arxivId: paper.arxivId,
        encryptedApiKey: user.apiKey || null,
        jobId: id,
        processedPaperId: processedPaper._id!.toString(),
      });

      log.info({ jobId: id, arxivId }, "Single paper retry queued");
    } else if (job.type === "batch_scrape") {
      const categories = job.input.categories;
      const papersPerCategory = job.input.papersPerCategory;

      if (!categories || !papersPerCategory) {
        await jobs.updateOne(
          { _id: new ObjectId(id) },
          { $set: { status: "failed", updatedAt: new Date() } }
        );
        return NextResponse.json({ error: "Job is missing required batch input" }, { status: 400 });
      }

      await jobs.updateOne(
        { _id: new ObjectId(id) },
        { $set: { progress: { total: categories.length * papersPerCategory, completed: 0 } } }
      );

      const queueData: Record<string, unknown> = {
        userId: userId,
        jobId: id,
        categories,
        papersPerCategory,
        maxPagesPerPaper: user.settings.maxPagesPerPaper,
        encryptedApiKey: user.apiKey || null,
      };

      if (job.input.keywords !== undefined) {
        queueData.keywords = job.input.keywords;
      }

      if (job.input.keywordMatchMode !== undefined) {
        queueData.keywordMatchMode = job.input.keywordMatchMode;
      }

      await paperProcessingQueue.add("batch-scrape", queueData);

      log.info({ jobId: id }, "Batch scrape retry queued");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error({ err: error }, "Retry job failed");
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
