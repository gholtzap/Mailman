import { NextResponse, after } from "next/server";
import { ObjectId } from "mongodb";
import { getPapersCollection, getProcessedPapersCollection, getProcessingJobsCollection } from "@/lib/db/collections";
import { createLogger } from "@/lib/logging";
import { processSinglePaper } from "@/lib/processing/single";
import { processBatchScrape } from "@/lib/processing/batch";
import { getAuthenticatedUser } from "@/lib/auth/get-authenticated-user";

export const maxDuration = 300;

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: Request,
  { params }: RouteParams
) {
  const authResult = await getAuthenticatedUser();
  if (authResult.error) return authResult.error;
  const { user } = authResult;
  const log = createLogger({ route: "retry-job", userId: user.clerkId });

  try {

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

      after(async () => {
        await processSinglePaper({
          processedPaperId: processedPaper._id!.toString(),
          jobId: id,
          arxivId: paper.arxivId,
          encryptedApiKey: user.apiKey || null,
          skipAI: job.input.skipAI ?? false,
        });
      });

      log.info({ jobId: id, arxivId }, "Single paper retry triggered");
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

      after(() =>
        processBatchScrape({
          jobId: id,
          userId: user._id!,
          categories,
          papersPerCategory,
          keywords: job.input.keywords,
          keywordMatchMode: job.input.keywordMatchMode,
          encryptedApiKey: user.apiKey || null,
          skipAI: job.input.skipAI,
        })
      );

      log.info({ jobId: id }, "Batch scrape retry triggered");
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
