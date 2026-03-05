import { NextResponse, after } from "next/server";
import { getPapersCollection, getProcessedPapersCollection, getProcessingJobsCollection } from "@/lib/db/collections";
import { createLogger } from "@/lib/logging";
import { processSinglePaper } from "@/lib/processing/single";
import { processBatchScrape } from "@/lib/processing/batch";
import { migrateApiKeyIfLegacy } from "@/lib/encryption";
import { getAuthenticatedUser } from "@/lib/auth/get-authenticated-user";
import { parseRouteParams } from "@/lib/validation/parse-route-params";
import { apiError } from "@/lib/api/errors";
import { checkRateLimit } from "@/lib/rate-limit";

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

  const rateLimited = await checkRateLimit(user.clerkId, "processing");
  if (rateLimited) return rateLimited;

  const log = createLogger({ route: "retry-job", userId: user.clerkId });

  const parsed = await parseRouteParams(params);
  if (parsed.error) return parsed.error;

  try {
    const jobs = await getProcessingJobsCollection();

    const job = await jobs.findOneAndUpdate(
      {
        _id: parsed.id,
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
      const existing = await jobs.findOne({ _id: parsed.id });
      if (!existing) {
        return apiError("Job not found", 404);
      }
      if (existing.userId.toString() !== user._id!.toString()) {
        return apiError("Unauthorized", 403);
      }
      return apiError("Job cannot be retried in its current state", 400);
    }

    log.info({ jobId: parsed.id.toString(), jobType: job.type }, "Retrying job");

    if (job.type === "single_paper") {
      const arxivId = job.input.arxivId || job.input.arxivUrl?.split("/abs/")[1];
      if (!arxivId) {
        await jobs.updateOne(
          { _id: parsed.id },
          { $set: { status: "failed", updatedAt: new Date() } }
        );
        return apiError("Job is missing paper identifier", 400);
      }

      const papers = await getPapersCollection();
      const paper = await papers.findOne({ arxivId });

      if (!paper) {
        await jobs.updateOne(
          { _id: parsed.id },
          { $set: { status: "failed", updatedAt: new Date() } }
        );
        return apiError("Paper not found", 404);
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
          { _id: parsed.id },
          { $set: { status: "failed", updatedAt: new Date() } }
        );
        return apiError("Processed paper record not found or already in progress", 400);
      }

      await jobs.updateOne(
        { _id: parsed.id },
        { $set: { progress: { total: 1, completed: 0 } } }
      );

      const encryptedApiKey = user.apiKey
        ? await migrateApiKeyIfLegacy(user._id!, user.apiKey)
        : null;

      after(async () => {
        await processSinglePaper({
          processedPaperId: processedPaper._id!.toString(),
          jobId: parsed.id.toString(),
          arxivId: paper.arxivId,
          encryptedApiKey,
          skipAI: job.input.skipAI ?? false,
        });
      });

      log.info({ jobId: parsed.id.toString(), arxivId }, "Single paper retry triggered");
    } else if (job.type === "batch_scrape") {
      const categories = job.input.categories;
      const papersPerCategory = job.input.papersPerCategory;

      if (!categories || !papersPerCategory) {
        await jobs.updateOne(
          { _id: parsed.id },
          { $set: { status: "failed", updatedAt: new Date() } }
        );
        return apiError("Job is missing required batch input", 400);
      }

      await jobs.updateOne(
        { _id: parsed.id },
        { $set: { progress: { total: categories.length * papersPerCategory, completed: 0 } } }
      );

      const encryptedApiKeyBatch = user.apiKey
        ? await migrateApiKeyIfLegacy(user._id!, user.apiKey)
        : null;

      after(() =>
        processBatchScrape({
          jobId: parsed.id.toString(),
          userId: user._id!,
          categories,
          papersPerCategory,
          keywords: job.input.keywords,
          keywordMatchMode: job.input.keywordMatchMode,
          encryptedApiKey: encryptedApiKeyBatch,
          skipAI: job.input.skipAI,
        })
      );

      log.info({ jobId: parsed.id.toString() }, "Batch scrape retry triggered");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error({ err: error }, "Retry job failed");
    return apiError("Internal server error", 500, error instanceof Error ? error.message : "Unknown error");
  }
}
