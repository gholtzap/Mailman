import { NextResponse } from "next/server";
import { getRecurringSchedulesCollection, getProcessingJobsCollection, getUsersCollection } from "@/lib/db/collections";
import { paperProcessingQueue } from "@/lib/queue";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!process.env.CRON_SECRET || token !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const schedules = await getRecurringSchedulesCollection();
    const users = await getUsersCollection();
    const jobs = await getProcessingJobsCollection();

    const now = new Date();
    const dueSchedules = await schedules
      .find({
        status: "active",
        nextRunAt: { $lte: now },
      })
      .limit(10)
      .toArray();

    console.log(`[Cron] Found ${dueSchedules.length} due schedules`);

    const results = [];

    for (const schedule of dueSchedules) {
      try {
        const user = await users.findOne({ _id: schedule.userId });

        if (!user) {
          console.log(`[Cron] User not found for schedule ${schedule._id}, skipping`);
          continue;
        }

        if (!user.apiKey) {
          console.log(`[Cron] User ${user._id} has no API key, pausing schedule ${schedule._id}`);
          await schedules.updateOne(
            { _id: schedule._id },
            { $set: { status: "paused", updatedAt: new Date() } }
          );
          results.push({
            scheduleId: schedule._id,
            status: "paused",
            reason: "No API key configured",
          });
          continue;
        }

        const job = await jobs.insertOne({
          userId: user._id!,
          type: "batch_scrape",
          status: "queued",
          input: {
            categories: schedule.categories,
            papersPerCategory: schedule.papersPerCategory,
          },
          progress: {
            total: schedule.categories.length * schedule.papersPerCategory,
            completed: 0,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        console.log(`[Cron] Created job ${job.insertedId} for schedule ${schedule._id}`);

        await paperProcessingQueue.add("batch-scrape", {
          userId: user.clerkId,
          jobId: job.insertedId.toString(),
          categories: schedule.categories,
          papersPerCategory: schedule.papersPerCategory,
          maxPagesPerPaper: user.settings.maxPagesPerPaper,
          encryptedApiKey: user.apiKey,
          scheduleId: schedule._id.toString(),
          notificationEmail: schedule.email,
        });

        console.log(`[Cron] Queued job ${job.insertedId} for schedule ${schedule._id}`);

        const nextRunAt = new Date(now);
        nextRunAt.setDate(nextRunAt.getDate() + schedule.intervalDays);

        await schedules.updateOne(
          { _id: schedule._id },
          {
            $set: {
              lastRunAt: now,
              lastRunJobId: job.insertedId,
              nextRunAt: nextRunAt,
              updatedAt: now,
            },
            $inc: { runCount: 1 },
          }
        );

        console.log(`[Cron] Updated schedule ${schedule._id}, next run at ${nextRunAt}`);

        results.push({
          scheduleId: schedule._id,
          jobId: job.insertedId,
          status: "success",
          nextRunAt,
        });
      } catch (error) {
        console.error(`[Cron] Error processing schedule ${schedule._id}:`, error);
        results.push({
          scheduleId: schedule._id,
          status: "error",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
    });
  } catch (error) {
    console.error("[Cron] ERROR:", error);
    return NextResponse.json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
