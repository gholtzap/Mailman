import { ObjectId } from "mongodb";
import {
  getPapersCollection,
  getProcessedPapersCollection,
  getProcessingJobsCollection,
} from "@/lib/db/collections";
import { processSinglePaper } from "@/lib/processing/single";
import { sendBatchCompletionEmail } from "@/lib/email/send-batch-completion";
import { createLogger } from "@/lib/logging";

interface ProcessBatchScrapeParams {
  jobId: string;
  userId: ObjectId;
  categories: string[];
  papersPerCategory: number;
  keywords?: string[];
  keywordMatchMode?: "any" | "all";
  encryptedApiKey: { encryptedValue: string; iv: string; authTag: string } | null;
  skipAI?: boolean;
  notificationEmail?: string;
  scheduleName?: string;
}

interface ArxivPaper {
  arxivId: string;
  title: string;
  authors: string[];
  abstract: string;
  categories: string[];
  pdfUrl: string;
  publishedDate: Date;
  createdAt: Date;
}

function matchesKeywords(
  paper: { title: string; abstract: string },
  keywords: string[] | undefined,
  matchMode: "any" | "all"
): boolean {
  if (!keywords || keywords.length === 0) {
    return true;
  }

  const combinedText = `${paper.title} ${paper.abstract}`.toLowerCase();
  const keywordsLower = keywords.map((kw) => kw.toLowerCase());

  if (matchMode === "all") {
    return keywordsLower.every((kw) => combinedText.includes(kw));
  }
  return keywordsLower.some((kw) => combinedText.includes(kw));
}

async function fetchArxivPapers(
  category: string,
  maxResults: number
): Promise<ArxivPaper[]> {
  const url = `https://export.arxiv.org/api/query?search_query=cat:${category}&start=0&max_results=${maxResults}&sortBy=submittedDate&sortOrder=descending`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch papers from arXiv: ${response.status}`);
  }

  const xml = await response.text();
  const entries = xml.match(/<entry>(.*?)<\/entry>/gs);
  if (!entries) {
    return [];
  }

  const papers: ArxivPaper[] = [];

  for (const entry of entries) {
    const idMatch = entry.match(/<id>(.*?)<\/id>/);
    const rawId = idMatch?.[1] || "";
    const arxivId = rawId.split("/abs/").pop() || "";

    const titleMatch = entry.match(/<title>(.*?)<\/title>/s);
    const title = titleMatch?.[1]?.trim().replace(/\n/g, " ") || "";

    const summaryMatch = entry.match(/<summary>(.*?)<\/summary>/s);
    const abstract = summaryMatch?.[1]?.trim().replace(/\n/g, " ") || "";

    const authorsMatch = entry.match(/<author>(.*?)<\/author>/gs);
    const authors =
      authorsMatch?.map((a) => {
        const nameMatch = a.match(/<name>(.*?)<\/name>/);
        return nameMatch?.[1]?.trim() || "";
      }) || [];

    const categoriesMatch = entry.match(/<category term="(.*?)".*?\/>/gs);
    const categories =
      categoriesMatch?.map((c) => {
        const match = c.match(/term="(.*?)"/);
        return match?.[1] || "";
      }) || [];

    const publishedMatch = entry.match(/<published>(.*?)<\/published>/);
    const publishedDate = publishedMatch?.[1]
      ? new Date(publishedMatch[1])
      : new Date();

    if (!arxivId) {
      continue;
    }

    papers.push({
      arxivId,
      title,
      authors,
      abstract,
      categories,
      pdfUrl: `https://arxiv.org/pdf/${arxivId}.pdf`,
      publishedDate,
      createdAt: new Date(),
    });
  }

  return papers;
}

export async function processBatchScrape({
  jobId,
  userId,
  categories,
  papersPerCategory,
  keywords,
  keywordMatchMode = "any",
  encryptedApiKey,
  skipAI,
  notificationEmail,
  scheduleName,
}: ProcessBatchScrapeParams) {
  const log = createLogger({ route: "batch-scrape", jobId });

  try {
    const jobs = await getProcessingJobsCollection();
    await jobs.updateOne(
      { _id: new ObjectId(jobId) },
      { $set: { status: "running", updatedAt: new Date() } }
    );

    const papersCollection = await getPapersCollection();
    const processedPapers = await getProcessedPapersCollection();

    let totalPapersQueued = 0;
    let filteredCount = 0;

    for (const category of categories) {
      log.info({ category, papersPerCategory }, "Fetching papers for category");

      let fetchedPapers: ArxivPaper[];
      try {
        fetchedPapers = await fetchArxivPapers(category, papersPerCategory);
      } catch (fetchError) {
        log.error({ err: fetchError, category }, "Failed to fetch papers for category");
        continue;
      }

      for (const paperData of fetchedPapers) {
        if (!matchesKeywords(paperData, keywords, keywordMatchMode)) {
          filteredCount++;
          log.debug({ arxivId: paperData.arxivId }, "Paper filtered out by keywords");
          continue;
        }

        const upsertResult = await papersCollection.updateOne(
          { arxivId: paperData.arxivId },
          { $setOnInsert: paperData },
          { upsert: true }
        );

        const paper = await papersCollection.findOne({ arxivId: paperData.arxivId });
        if (!paper) {
          log.error({ arxivId: paperData.arxivId }, "Paper not found after upsert");
          continue;
        }

        const existingProcessed = await processedPapers.findOne({
          userId,
          arxivId: paperData.arxivId,
        });

        if (existingProcessed) {
          log.debug({ arxivId: paperData.arxivId }, "Paper already processed by user");
          continue;
        }

        const procResult = await processedPapers.insertOne({
          userId,
          paperId: paper._id!,
          arxivId: paperData.arxivId,
          status: "pending",
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        totalPapersQueued++;

        try {
          await processSinglePaper({
            processedPaperId: procResult.insertedId.toString(),
            jobId,
            arxivId: paperData.arxivId,
            encryptedApiKey,
            skipAI: skipAI ?? false,
          });
        } catch (paperError) {
          log.error({ err: paperError, arxivId: paperData.arxivId }, "Failed to process paper");
        }

        await jobs.updateOne(
          { _id: new ObjectId(jobId) },
          {
            $set: { updatedAt: new Date() },
            $inc: { "progress.completed": 1 },
          }
        );
      }
    }

    const finalStatus = totalPapersQueued > 0 ? "completed" : "failed";

    await jobs.updateOne(
      { _id: new ObjectId(jobId) },
      {
        $set: {
          status: finalStatus,
          "progress.total": totalPapersQueued,
          updatedAt: new Date(),
        },
      }
    );

    log.info(
      { totalPapersQueued, filteredCount },
      "Batch scrape completed"
    );

    if (finalStatus === "completed" && notificationEmail) {
      try {
        await sendBatchCompletionEmail({
          jobId,
          notificationEmail,
          scheduleName,
          categories,
        });
      } catch (emailError) {
        log.error({ err: emailError }, "Failed to send batch completion email");
      }
    }
  } catch (error) {
    log.error({ err: error }, "Batch scrape failed");

    const jobs = await getProcessingJobsCollection();
    await jobs.updateOne(
      { _id: new ObjectId(jobId) },
      { $set: { status: "failed", updatedAt: new Date() } }
    );
  }
}
