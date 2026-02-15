import { NextResponse, after } from "next/server";
import { getRecurringSchedulesCollection, getProcessingJobsCollection, getUsersCollection } from "@/lib/db/collections";
import { processBatchScrape } from "@/lib/processing/batch";
import { computeNextRunAt } from "@/lib/scheduling/next-run";
import { createLogger } from "@/lib/logging";

export const maxDuration = 300;

export async function GET(request: Request) {
  const log = createLogger({ route: "cron-process-schedules" });

  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!process.env.CRON_SECRET || token !== process.env.CRON_SECRET) {
      log.warn("Unauthorized cron request");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    log.info("Starting scheduled processing job");

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

    log.info({ count: dueSchedules.length }, "Found due schedules");

    const results = [];

    for (const schedule of dueSchedules) {
      const scheduleLog = log.child({ scheduleId: schedule._id });
      try {
        const user = await users.findOne({ _id: schedule.userId });

        if (!user) {
          scheduleLog.warn("User not found, skipping schedule");
          continue;
        }

        const jobInput: any = {
          categories: schedule.categories,
          papersPerCategory: schedule.papersPerCategory,
        };

        if (schedule.keywords !== undefined) {
          jobInput.keywords = schedule.keywords;
        }

        if (schedule.keywordMatchMode !== undefined) {
          jobInput.keywordMatchMode = schedule.keywordMatchMode;
        }

        const job = await jobs.insertOne({
          userId: user._id!,
          scheduleId: schedule._id,
          type: "batch_scrape",
          status: "queued",
          input: jobInput,
          progress: {
            total: schedule.categories.length * schedule.papersPerCategory,
            completed: 0,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        scheduleLog.info({ jobId: job.insertedId }, "Created job for schedule");

        after(() =>
          processBatchScrape({
            jobId: job.insertedId.toString(),
            userId: user._id!,
            categories: schedule.categories,
            papersPerCategory: schedule.papersPerCategory,
            keywords: schedule.keywords,
            keywordMatchMode: schedule.keywordMatchMode,
            encryptedApiKey: user.apiKey || null,
            notificationEmail: schedule.email || user.email,
            scheduleName: schedule.name,
          })
        );

        const nextRunAt = computeNextRunAt({
          scheduleType: schedule.scheduleType ?? "interval",
          intervalDays: schedule.intervalDays,
          weekDays: schedule.weekDays ?? [],
          preferredHour: schedule.preferredHour ?? 6,
          timezone: schedule.timezone ?? "UTC",
          afterDate: now,
        });

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

        scheduleLog.info({ nextRunAt }, "Schedule updated successfully");

        results.push({
          scheduleId: schedule._id,
          jobId: job.insertedId,
          status: "success",
          nextRunAt,
        });
      } catch (error) {
        scheduleLog.error({ err: error }, "Error processing schedule");
        results.push({
          scheduleId: schedule._id,
          status: "error",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    log.info({ processed: results.length }, "Completed schedule processing");

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
    });
  } catch (error) {
    log.error({ err: error }, "Cron job failed");
    return NextResponse.json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
