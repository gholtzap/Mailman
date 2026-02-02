import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import {
  getProcessingJobsCollection,
  getRecurringSchedulesCollection,
  getProcessedPapersCollection,
  getPapersCollection,
} from "@/lib/db/collections";
import { getResendClient, FROM_EMAIL } from "@/lib/email/client";
import {
  generateBatchCompletionEmail,
  generateBatchCompletionTextEmail,
} from "@/lib/email/templates";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { jobId, scheduleId } = body;

    if (!jobId) {
      return NextResponse.json(
        { error: "jobId is required" },
        { status: 400 }
      );
    }

    const jobs = await getProcessingJobsCollection();
    const job = await jobs.findOne({ _id: new ObjectId(jobId) });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.status !== "completed") {
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
      }
    }

    if (!notificationEmail) {
      return NextResponse.json(
        { error: "No notification email configured for this schedule" },
        { status: 400 }
      );
    }

    const processedPapers = await getProcessedPapersCollection();
    const papers = await getPapersCollection();

    const jobProcessedPapers = await processedPapers
      .find({
        userId: job.userId,
        status: "completed",
        createdAt: { $gte: job.createdAt },
      })
      .sort({ createdAt: -1 })
      .limit(job.input.papersPerCategory! * job.input.categories!.length)
      .toArray();

    const paperSummaries = await Promise.all(
      jobProcessedPapers.map(async (pp) => {
        const paper = await papers.findOne({ _id: pp.paperId });
        if (!paper) return null;

        return {
          title: paper.title,
          arxivId: paper.arxivId,
          summary:
            pp.humanizedContent?.substring(0, 300) ||
            pp.generatedContent?.substring(0, 300) ||
            "Summary not available",
          url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/papers/${pp._id}`,
        };
      })
    );

    const validPaperSummaries = paperSummaries.filter((p) => p !== null);

    if (validPaperSummaries.length === 0) {
      return NextResponse.json(
        { error: "No papers found for this job" },
        { status: 404 }
      );
    }

    const htmlEmail = generateBatchCompletionEmail(
      scheduleName,
      validPaperSummaries,
      job.input.categories || []
    );

    const textEmail = generateBatchCompletionTextEmail(
      scheduleName,
      validPaperSummaries,
      job.input.categories || []
    );

    const resend = getResendClient();

    await resend.emails.send({
      from: FROM_EMAIL,
      to: notificationEmail,
      subject: `${validPaperSummaries.length} Paper Summaries Ready - ${scheduleName}`,
      html: htmlEmail,
      text: textEmail,
    });

    return NextResponse.json({
      success: true,
      emailSent: true,
      recipientEmail: notificationEmail,
      paperCount: validPaperSummaries.length,
    });
  } catch (error) {
    console.error("[Email Batch Completion] ERROR:", error);
    return NextResponse.json(
      {
        error: "Failed to send email",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
