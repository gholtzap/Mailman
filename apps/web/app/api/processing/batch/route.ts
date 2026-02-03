import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getUsersCollection, getProcessingJobsCollection } from "@/lib/db/collections";
import { paperProcessingQueue } from "@/lib/queue";

export async function POST(request: Request) {
  try {
    console.log('[Batch API] Starting batch processing request');

    const { userId } = await auth();
    if (!userId) {
      console.log('[Batch API] Unauthorized - no userId');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.log('[Batch API] User authenticated:', userId);

    const body = await request.json();
    console.log('[Batch API] Request body:', body);

    console.log('[Batch API] Fetching user from database...');
    const users = await getUsersCollection();
    const user = await users.findOne({ clerkId: userId });

    if (!user) {
      console.log('[Batch API] User not found in database');
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    console.log('[Batch API] User found:', user._id);

    if (!user.apiKey) {
      console.log('[Batch API] User has no API key configured');
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 400 }
      );
    }
    console.log('[Batch API] User has API key configured');

    if (!user.settings) {
      console.log('[Batch API] User has no settings configured');
      return NextResponse.json(
        { error: "User settings not found. Please contact support." },
        { status: 400 }
      );
    }
    console.log('[Batch API] User settings found');

    const { categories: providedCategories, papersPerCategory, keywords, keywordMatchMode } = body;
    const categories = providedCategories && providedCategories.length > 0
      ? providedCategories
      : user.settings.defaultCategories;

    console.log('[Batch API] Using categories:', categories);

    if (!categories || categories.length === 0) {
      console.log('[Batch API] No categories available (neither provided nor in default settings)');
      return NextResponse.json(
        { error: "At least one category is required" },
        { status: 400 }
      );
    }

    if (keywordMatchMode && !["any", "all"].includes(keywordMatchMode)) {
      console.log('[Batch API] Invalid keywordMatchMode:', keywordMatchMode);
      return NextResponse.json(
        { error: "keywordMatchMode must be 'any' or 'all'" },
        { status: 400 }
      );
    }

    console.log('[Batch API] Creating job record...');
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
    console.log('[Batch API] Job created:', job.insertedId);

    console.log('[Batch API] Adding job to queue...');
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
    console.log('[Batch API] Job added to queue successfully');

    return NextResponse.json({ success: true, jobId: job.insertedId });
  } catch (error) {
    console.error('[Batch API] ERROR:', error);
    return NextResponse.json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
