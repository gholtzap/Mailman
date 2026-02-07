import { auth } from "@clerk/nextjs/server";
import { NextResponse, after } from "next/server";
import { getUsersCollection, getProcessingJobsCollection } from "@/lib/db/collections";
import { processBatchScrape } from "@/lib/processing/batch";
import { createLogger } from "@/lib/logging";

export const maxDuration = 300;

export async function POST(request: Request) {
  const { userId } = await auth();
  const log = createLogger({ route: "batch-processing", userId: userId || "anonymous" });

  try {
    log.info("Starting batch processing request");

    if (!userId) {
      log.warn("Unauthorized request - no userId");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    log.debug({ body }, "Received request body");

    const users = await getUsersCollection();
    const user = await users.findOne({ clerkId: userId });

    if (!user) {
      log.warn("User not found in database");
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    log.debug({ dbUserId: user._id }, "User found in database");

    if (!user.apiKey) {
      log.info("User has no API key - will process without AI summarization");
    }

    if (!user.settings) {
      log.error("User has no settings configured");
      return NextResponse.json(
        { error: "User settings not found. Please contact support." },
        { status: 400 }
      );
    }

    const { categories: providedCategories, papersPerCategory, keywords, keywordMatchMode, skipAI } = body;
    const categories = providedCategories && providedCategories.length > 0
      ? providedCategories
      : user.settings.defaultCategories;

    log.debug({ categories, papersPerCategory, keywords, keywordMatchMode, skipAI }, "Processing parameters");

    if (!categories || categories.length === 0) {
      log.warn("No categories available");
      return NextResponse.json(
        { error: "At least one category is required" },
        { status: 400 }
      );
    }

    if (keywordMatchMode && !["any", "all"].includes(keywordMatchMode)) {
      log.warn({ keywordMatchMode }, "Invalid keywordMatchMode");
      return NextResponse.json(
        { error: "keywordMatchMode must be 'any' or 'all'" },
        { status: 400 }
      );
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

    after(() =>
      processBatchScrape({
        jobId: job.insertedId.toString(),
        userId: user._id!,
        categories,
        papersPerCategory: papersPerCategory || user.settings.papersPerCategory,
        keywords,
        keywordMatchMode,
        encryptedApiKey: user.apiKey || null,
        skipAI,
        notificationEmail: user.email,
      })
    );
    log.info("Batch processing triggered");

    return NextResponse.json({ success: true, jobId: job.insertedId });
  } catch (error) {
    log.error({ err: error }, "Batch processing failed");
    return NextResponse.json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
