import { ObjectId } from "mongodb";
import { getProcessedPapersCollection, getProcessingJobsCollection } from "@/lib/db/collections";
import { serialize } from "./serialize";
import { WithId } from "mongodb";
import { User } from "@/lib/types";

export async function fetchDashboardData(user: WithId<User>) {
  const processedPapers = await getProcessedPapersCollection();
  const jobs = await getProcessingJobsCollection();

  const [recentPapers, activeJobs, recentJobs, completedCount, totalCostResult] =
    await Promise.all([
      processedPapers
        .find({ userId: user._id })
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray(),
      jobs
        .find({
          userId: user._id,
          status: { $in: ["queued", "running", "failed"] },
          updatedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        })
        .sort({ createdAt: -1 })
        .toArray(),
      jobs
        .find({
          userId: user._id,
          type: "batch_scrape",
          status: { $in: ["completed", "failed"] },
        })
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray(),
      processedPapers.countDocuments({
        userId: user._id,
        status: "completed",
      }),
      processedPapers
        .aggregate([
          { $match: { userId: user._id, status: "completed" } },
          { $group: { _id: null, total: { $sum: "$costs.estimatedCostUsd" } } },
        ])
        .toArray(),
    ]);

  return serialize({
    recentPapers,
    activeJobs,
    recentJobs,
    stats: {
      completedPapers: completedCount,
      monthlyUsage: user.usage.currentMonthPapersProcessed,
      totalCost: totalCostResult[0]?.total || 0,
      hasApiKey: !!user.apiKey,
    },
  });
}
