import { NextResponse, after } from "next/server";
import { getProcessingJobsCollection } from "@/lib/db/collections";
import { processBatchScrape } from "@/lib/processing/batch";
import { migrateApiKeyIfLegacy } from "@/lib/encryption";
import { createLogger } from "@/lib/logging";
import { getAuthenticatedUser } from "@/lib/auth/get-authenticated-user";
import { parseRequestBody } from "@/lib/validation/parse-request";
import { processingBatchSchema } from "@/lib/validation/schemas/processing";
import { apiError } from "@/lib/api/errors";

export const maxDuration = 300;

export async function POST(request: Request) {
  const authResult = await getAuthenticatedUser();
  if (authResult.error) return authResult.error;
  const { user } = authResult;
  const log = createLogger({ route: "batch-processing", userId: user.clerkId });

  try {
    log.info("Starting batch processing request");

    const parsed = await parseRequestBody(request, processingBatchSchema);
    if (parsed.error) return parsed.error;
    log.debug({ body: parsed.data }, "Received request body");

    if (!user.apiKey) {
      log.info("User has no API key - will process without AI summarization");
    }

    if (!user.settings) {
      log.error("User has no settings configured");
      return apiError("User settings not found. Please contact support.", 400);
    }

    const { categories: providedCategories, papersPerCategory, keywords, keywordMatchMode, skipAI } = parsed.data;
    const categories = providedCategories && providedCategories.length > 0
      ? providedCategories
      : user.settings.defaultCategories;

    log.debug({ categories, papersPerCategory, keywords, keywordMatchMode, skipAI }, "Processing parameters");

    if (!categories || categories.length === 0) {
      log.warn("No categories available");
      return apiError("At least one category is required", 400);
    }

    const jobs = await getProcessingJobsCollection();
    const jobInput: any = {
      categories,
      papersPerCategory: papersPerCategory || user.settings.papersPerCategory,
    };

    if (keywords !== undefined) {
      jobInput.keywords = keywords;
    }

    if (keywordMatchMode !== undefined) {
      jobInput.keywordMatchMode = keywordMatchMode;
    }

    if (skipAI !== undefined) {
      jobInput.skipAI = skipAI;
    }

    const job = await jobs.insertOne({
      userId: user._id!,
      type: "batch_scrape",
      status: "queued",
      input: jobInput,
      progress: {
        total: categories.length * (papersPerCategory || user.settings.papersPerCategory),
        completed: 0,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    log.info({ jobId: job.insertedId }, "Job created and queued");

    const encryptedApiKey = user.apiKey
      ? await migrateApiKeyIfLegacy(user._id!, user.apiKey)
      : null;

    after(() =>
      processBatchScrape({
        jobId: job.insertedId.toString(),
        userId: user._id!,
        categories,
        papersPerCategory: papersPerCategory || user.settings.papersPerCategory,
        keywords,
        keywordMatchMode,
        encryptedApiKey,
        skipAI,
        notificationEmail: user.email,
      })
    );
    log.info("Batch processing triggered");

    return NextResponse.json({ success: true, jobId: job.insertedId });
  } catch (error) {
    log.error({ err: error }, "Batch processing failed");
    return apiError("Internal server error", 500, error instanceof Error ? error.message : String(error));
  }
}
