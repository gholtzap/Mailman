import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getUsersCollection, getProcessingJobsCollection } from "@/lib/db/collections";
import { paperProcessingQueue } from "@/lib/queue";
import { createLogger } from "@/lib/logging";

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
      log.warn("User has no API key configured");
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 400 }
      );
    }

    if (!user.settings) {
      log.error("User has no settings configured");
      return NextResponse.json(
        { error: "User settings not found. Please contact support." },
        { status: 400 }
      );
    }

    const { categories: providedCategories, papersPerCategory, keywords, keywordMatchMode } = body;
    const categories = providedCategories && providedCategories.length > 0
      ? providedCategories
      : user.settings.defaultCategories;

    log.debug({ categories, papersPerCategory, keywords, keywordMatchMode }, "Processing parameters");

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

    const queueData: any = {
      userId: userId,
      jobId: job.insertedId.toString(),
      categories,
      papersPerCategory: papersPerCategory || user.settings.papersPerCategory,
      maxPagesPerPaper: user.settings.maxPagesPerPaper,
      encryptedApiKey: user.apiKey,
    };

    if (keywords !== undefined) {
      queueData.keywords = keywords;
    }

    if (keywordMatchMode !== undefined) {
      queueData.keywordMatchMode = keywordMatchMode;
    }

    await paperProcessingQueue.add("batch-scrape", queueData);
    log.info("Job added to queue successfully");

    return NextResponse.json({ success: true, jobId: job.insertedId });
  } catch (error) {
    log.error({ err: error }, "Batch processing failed");
    return NextResponse.json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
