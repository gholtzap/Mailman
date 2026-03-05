import "@/lib/polyfills/dommatrix";
import Anthropic from "@anthropic-ai/sdk";
import { ObjectId } from "mongodb";
import {
  getProcessedPapersCollection,
  getPapersCollection,
  getProcessingJobsCollection,
} from "@/lib/db/collections";
import { decryptApiKey } from "@/lib/encryption";
import { READ_PAPER_PROMPT } from "@/lib/prompts/read_paper";
import { HUMANIZE_PROMPT } from "@/lib/prompts/humanize";
import { createLogger } from "@/lib/logging";

interface ProcessSinglePaperParams {
  processedPaperId: string;
  jobId: string;
  arxivId: string;
  encryptedApiKey: { encryptedValue: string; iv: string; authTag: string; salt?: string } | null;
  skipAI?: boolean;
}

const MAX_PAGES = 50;

async function getPdfPageCount(buffer: Buffer): Promise<number> {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "pdfjs-dist/legacy/build/pdf.worker.mjs";
  const pdf = await pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
    standardFontDataUrl: undefined,
    useWorkerFetch: false,
    isEvalSupported: false,
  }).promise;
  return pdf.numPages;
}

async function extractRawText(buffer: Buffer): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "pdfjs-dist/legacy/build/pdf.worker.mjs";
  const pdf = await pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
    standardFontDataUrl: undefined,
    useWorkerFetch: false,
    isEvalSupported: false,
  }).promise;

  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    pages.push(`--- Page ${i} ---\n${pageText}\n`);
  }

  return pages.join("\n");
}

export async function processSinglePaper({
  processedPaperId,
  jobId,
  arxivId,
  encryptedApiKey,
  skipAI,
}: ProcessSinglePaperParams) {
  const log = createLogger({ route: "process-single-paper", arxivId });

  try {
    const apiKey = encryptedApiKey ? decryptApiKey(encryptedApiKey) : null;

    const processedPapers = await getProcessedPapersCollection();
    await processedPapers.updateOne(
      { _id: new ObjectId(processedPaperId) },
      { $set: { status: "processing", updatedAt: new Date() } }
    );

    const papersCollection = await getPapersCollection();
    const paperRecord = await papersCollection.findOne({ arxivId });
    const pdfUrl = paperRecord?.pdfUrl || `https://arxiv.org/pdf/${arxivId}.pdf`;

    const pdfResponse = await fetch(pdfUrl);
    if (!pdfResponse.ok) {
      throw new Error(`Failed to fetch PDF: ${pdfResponse.status}`);
    }
    const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());

    const pageCount = await getPdfPageCount(pdfBuffer);
    if (pageCount > MAX_PAGES) {
      throw new Error(`Paper exceeds ${MAX_PAGES}-page limit (has ${pageCount} pages)`);
    }

    if (apiKey && !skipAI) {
      const client = new Anthropic({ apiKey });

      const opusResponse = await client.messages.create({
        model: "claude-opus-4-5-20251101",
        max_tokens: 16000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: pdfBuffer.toString("base64"),
                },
              },
              {
                type: "text",
                text: READ_PAPER_PROMPT,
              },
            ],
          },
        ],
      });

      const generatedText =
        opusResponse.content[0].type === "text" ? opusResponse.content[0].text : "";
      const opusInputTokens = opusResponse.usage.input_tokens;
      const opusOutputTokens = opusResponse.usage.output_tokens;

      const humanizeInput = HUMANIZE_PROMPT.includes("{text}")
        ? HUMANIZE_PROMPT.replace("{text}", generatedText)
        : `${HUMANIZE_PROMPT}\n\n---\n\n${generatedText}`;

      const sonnetResponse = await client.messages.create({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 16000,
        messages: [
          {
            role: "user",
            content: humanizeInput,
          },
        ],
      });

      const humanizedText =
        sonnetResponse.content[0].type === "text" ? sonnetResponse.content[0].text : "";
      const sonnetInputTokens = sonnetResponse.usage.input_tokens;
      const sonnetOutputTokens = sonnetResponse.usage.output_tokens;

      const opusCost =
        (opusInputTokens / 1_000_000) * 15.0 + (opusOutputTokens / 1_000_000) * 75.0;
      const sonnetCost =
        (sonnetInputTokens / 1_000_000) * 3.0 + (sonnetOutputTokens / 1_000_000) * 15.0;

      await processedPapers.updateOne(
        { _id: new ObjectId(processedPaperId) },
        {
          $set: {
            status: "completed",
            generatedContent: generatedText,
            humanizedContent: humanizedText,
            costs: {
              opusInputTokens,
              opusOutputTokens,
              sonnetInputTokens,
              sonnetOutputTokens,
              estimatedCostUsd: Math.round((opusCost + sonnetCost) * 10000) / 10000,
            },
            updatedAt: new Date(),
          },
        }
      );
    } else {
      const rawText = await extractRawText(pdfBuffer);

      await processedPapers.updateOne(
        { _id: new ObjectId(processedPaperId) },
        {
          $set: {
            status: "completed",
            generatedContent: rawText,
            humanizedContent: undefined,
            costs: {
              opusInputTokens: 0,
              opusOutputTokens: 0,
              sonnetInputTokens: 0,
              sonnetOutputTokens: 0,
              estimatedCostUsd: 0,
            },
            updatedAt: new Date(),
          },
        }
      );
    }

    const papers = await getPapersCollection();
    await papers.updateOne({ arxivId }, { $set: { pageCount } });

    const jobs = await getProcessingJobsCollection();
    await jobs.updateOne(
      { _id: new ObjectId(jobId) },
      {
        $set: {
          status: "completed",
          "progress.completed": 1,
          updatedAt: new Date(),
        },
      }
    );

    log.info({ arxivId }, "Paper processed successfully");
  } catch (error) {
    log.error({ err: error }, "Paper processing failed");

    const processedPapers = await getProcessedPapersCollection();
    await processedPapers.updateOne(
      { _id: new ObjectId(processedPaperId) },
      {
        $set: {
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
          updatedAt: new Date(),
        },
      }
    );

    const jobs = await getProcessingJobsCollection();
    await jobs.updateOne(
      { _id: new ObjectId(jobId) },
      {
        $set: {
          status: "failed",
          updatedAt: new Date(),
        },
      }
    );
  }
}
