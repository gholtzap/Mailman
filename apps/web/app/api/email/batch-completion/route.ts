import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import {
  getProcessingJobsCollection,
  getRecurringSchedulesCollection,
} from "@/lib/db/collections";
import { sendBatchCompletionEmail } from "@/lib/email/send-batch-completion";
import { createLogger } from "@/lib/logging";
import { parseRequestBody } from "@/lib/validation/parse-request";
import { batchCompletionEmailSchema } from "@/lib/validation/schemas/settings";

export async function POST(request: Request) {
  const log = createLogger({ route: "email-batch-completion" });

  try {
    const parsed = await parseRequestBody(request, batchCompletionEmailSchema);
    if (parsed.error) return parsed.error;
    const { jobId, scheduleId } = parsed.data;

    log.info({ jobId, scheduleId }, "Processing batch completion email");

    const jobs = await getProcessingJobsCollection();
    const job = await jobs.findOne({ _id: new ObjectId(jobId) });

    if (!job) {
      log.warn({ jobId }, "Job not found");
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.status !== "completed") {
      log.warn({ jobId, status: job.status }, "Job not completed");
      return NextResponse.json(
        { error: "Job is not completed yet" },
        { status: 400 }
      );
    }

    let notificationEmail: string | undefined;
    let scheduleName = "Batch Processing";

    if (scheduleId) {
      const schedules = await getRecurringSchedulesCollection();
      const schedule = await schedules.findOne({
        _id: new ObjectId(scheduleId),
      });

      if (schedule) {
        notificationEmail = schedule.email;
        scheduleName = schedule.name;
        log.debug(
          { scheduleId, scheduleName, notificationEmail },
          "Found schedule"
        );
      }
    }

    if (!notificationEmail) {
      log.warn({ scheduleId }, "No notification email configured");
      return NextResponse.json(
        { error: "No notification email configured for this schedule" },
        { status: 400 }
      );
    }

    const result = await sendBatchCompletionEmail({
      jobId,
      notificationEmail,
      scheduleName,
      categories: job.input.categories || [],
    });

    if (!result.sent) {
      log.warn({ jobId }, "No papers found for job");
      return NextResponse.json(
        { error: "No papers found for this job" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      emailSent: true,
      recipientEmail: notificationEmail,
      paperCount: result.paperCount,
    });
  } catch (error) {
    log.error({ err: error }, "Failed to send batch completion email");
    return NextResponse.json(
      {
        error: "Failed to send email",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
