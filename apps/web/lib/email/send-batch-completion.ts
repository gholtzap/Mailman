import { ObjectId } from "mongodb";
import { render } from "@react-email/render";
import {
  getProcessedPapersCollection,
  getPapersCollection,
  getProcessingJobsCollection,
} from "@/lib/db/collections";
import { getResendClient, FROM_EMAIL } from "@/lib/email/client";
import {
  BatchCompletionEmail,
  generateBatchCompletionText,
} from "@/lib/email/batch-completion-email";
import { createLogger } from "@/lib/logging";
import { getCategoryDisplayName, getExternalPaperUrl } from "@/lib/categories";

interface SendBatchCompletionEmailParams {
  jobId: string;
  notificationEmail: string;
  scheduleName?: string;
  categories?: string[];
}

export async function sendBatchCompletionEmail({
  jobId,
  notificationEmail,
  scheduleName = "Batch Processing",
  categories = [],
}: SendBatchCompletionEmailParams): Promise<{
  sent: boolean;
  paperCount: number;
}> {
  const log = createLogger({ route: "send-batch-email", jobId });

  const jobs = await getProcessingJobsCollection();
  const job = await jobs.findOne({ _id: new ObjectId(jobId) });

  if (!job) {
    throw new Error(`Job ${jobId} not found`);
  }

  const jobCategories =
    categories.length > 0 ? categories : job.input.categories || [];

  const processedPapers = await getProcessedPapersCollection();
  const papers = await getPapersCollection();

  const jobProcessedPapers = await processedPapers
    .find({
      userId: job.userId,
      status: "completed",
      updatedAt: { $gte: job.createdAt },
    })
    .sort({ updatedAt: -1 })
    .limit(
      (job.input.papersPerCategory || 5) *
        (job.input.categories?.length || 1)
    )
    .toArray();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

  const paperSummaries = await Promise.all(
    jobProcessedPapers.map(async (pp) => {
      const paper = await papers.findOne({ _id: pp.paperId });
      if (!paper) return null;

      const cleanedAbstract = paper.abstract
        ? paper.abstract.replace(
            /^(Background|Introduction|Objectives?|Purpose|Aims?|Context|Motivation|Summary)\s*/i,
            ""
          )
        : "";

      const abstract = cleanedAbstract
        ? cleanedAbstract.length > 300
          ? cleanedAbstract.substring(0, 300).trimEnd() + "..."
          : cleanedAbstract
        : "Summary not available";

      return {
        title: paper.title,
        arxivId: paper.arxivId,
        source: paper.source,
        summary: abstract,
        url: `${appUrl}/papers/${pp._id}`,
        externalUrl: getExternalPaperUrl(paper.arxivId, paper.source),
      };
    })
  );

  const validPaperSummaries = paperSummaries.filter((p) => p !== null);

  if (validPaperSummaries.length === 0) {
    log.info({ jobId }, "No papers found for job, skipping email");
    return { sent: false, paperCount: 0 };
  }

  const categoryDisplayNames = jobCategories.map(getCategoryDisplayName);

  const htmlEmail = await render(
    BatchCompletionEmail({
      scheduleName,
      papers: validPaperSummaries,
      categories: categoryDisplayNames,
      appUrl,
    })
  );

  const textEmail = generateBatchCompletionText(
    scheduleName,
    validPaperSummaries,
    categoryDisplayNames
  );

  const resend = getResendClient();

  log.info(
    { to: notificationEmail, paperCount: validPaperSummaries.length },
    "Sending batch completion email"
  );

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: notificationEmail,
    subject: `${validPaperSummaries.length} Paper Summaries Ready - ${scheduleName}`,
    html: htmlEmail,
    text: textEmail,
  });

  if (error) {
    throw new Error(`Resend API error: ${error.message}`);
  }

  log.info(
    { recipientEmail: notificationEmail, paperCount: validPaperSummaries.length, emailId: data?.id },
    "Email sent successfully"
  );

  return { sent: true, paperCount: validPaperSummaries.length };
}
