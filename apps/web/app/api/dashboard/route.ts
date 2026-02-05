import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getUsersCollection, getProcessedPapersCollection, getProcessingJobsCollection } from "@/lib/db/collections";
import { createLogger } from "@/lib/logging";

export async function GET() {
  const { userId } = await auth();
  const log = createLogger({ route: "dashboard", userId: userId || "anonymous" });

  try {
    log.info("Fetching dashboard data");

    if (!userId) {
      log.warn("Unauthorized request");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const users = await getUsersCollection();
    let user = await users.findOne({ clerkId: userId });

    if (!user) {
      log.info("User not found, creating new user");
      const clerkUser = await currentUser();
      const email = clerkUser?.emailAddresses[0]?.emailAddress || "";

      const result = await users.insertOne({
        clerkId: userId,
        email,
        settings: {
          defaultCategories: ["cs.AI", "cs.LG"],
          maxPagesPerPaper: 50,
          papersPerCategory: 5,
        },
        usage: {
          currentMonthPapersProcessed: 0,
          lastResetDate: new Date(),
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      user = await users.findOne({ _id: result.insertedId });
      if (!user) {
        log.error("Failed to create user after insert");
        return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
      }
      log.info({ dbUserId: user._id }, "User created successfully");
    }

    const processedPapers = await getProcessedPapersCollection();
    const jobs = await getProcessingJobsCollection();

    const recentPapers = await processedPapers
      .find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    const activeJobs = await jobs
      .find({
        userId: user._id,
        status: { $in: ["queued", "running", "failed"] },
      })
      .sort({ createdAt: -1 })
      .toArray();

    const completedCount = await processedPapers.countDocuments({
      userId: user._id,
      status: "completed",
    });

    const totalCost = await processedPapers
      .aggregate([
        { $match: { userId: user._id, status: "completed" } },
        {
          $group: {
            _id: null,
            total: { $sum: "$costs.estimatedCostUsd" },
          },
        },
      ])
      .toArray();

    log.debug(
      {
        recentPapersCount: recentPapers.length,
        activeJobsCount: activeJobs.length,
        completedCount,
      },
      "Dashboard data retrieved"
    );

    return NextResponse.json({
      recentPapers,
      activeJobs,
      stats: {
        completedPapers: completedCount,
        monthlyUsage: user.usage.currentMonthPapersProcessed,
        totalCost: totalCost[0]?.total || 0,
        hasApiKey: !!user.apiKey,
      },
    });
  } catch (error) {
    log.error({ err: error }, "Dashboard API error");
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
