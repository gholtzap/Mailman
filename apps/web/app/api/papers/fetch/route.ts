import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getPapersCollection } from "@/lib/db/collections";
import { createLogger } from "@/lib/logging";
import { parseRequestBody } from "@/lib/validation/parse-request";
import { papersFetchSchema } from "@/lib/validation/schemas/papers";
import { apiError, apiResponse } from "@/lib/api/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { MEDRXIV_CATEGORY_BY_API_NAME } from "@/lib/medrxiv-categories";

function extractArxivId(url: string): string | null {
  const patterns = [
    /arxiv\.org\/abs\/(\d+\.\d+)/,
    /arxiv\.org\/pdf\/(\d+\.\d+)/,
    /(\d{4}\.\d{4,5})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

function extractMedrxivDoi(url: string): string | null {
  const urlMatch = url.match(/medrxiv\.org\/content\/(10\.\d{4,9}\/[\d.]+)/);
  if (urlMatch) return urlMatch[1];

  const doiOrgMatch = url.match(/doi\.org\/(10\.1101\/[\d.]+)/);
  if (doiOrgMatch) return doiOrgMatch[1];

  const bareDoi = url.trim().match(/^(10\.1101\/[\d.]+)$/);
  if (bareDoi) return bareDoi[1];

  return null;
}

async function fetchArxivMetadata(arxivId: string) {
  const response = await fetch(
    `http://export.arxiv.org/api/query?id_list=${arxivId}`
  );
  const xml = await response.text();

  const entryMatch = xml.match(/<entry>(.*?)<\/entry>/s);
  if (!entryMatch) {
    throw new Error("Paper not found in arXiv");
  }

  const entry = entryMatch[1];

  const titleMatch = entry.match(/<title>(.*?)<\/title>/s);
  const summaryMatch = entry.match(/<summary>(.*?)<\/summary>/s);
  const authorsMatch = entry.match(/<author>(.*?)<\/author>/gs);
  const publishedMatch = entry.match(/<published>(.*?)<\/published>/);
  const categoriesMatch = entry.match(/<category term="(.*?)".*?\/>/gs);

  const title = titleMatch?.[1]?.trim().replace(/\n/g, " ") || "";
  const abstract = summaryMatch?.[1]?.trim().replace(/\n/g, " ") || "";
  const authors =
    authorsMatch?.map((a) => {
      const nameMatch = a.match(/<name>(.*?)<\/name>/);
      return nameMatch?.[1]?.trim() || "";
    }) || [];
  const publishedDate = publishedMatch?.[1] ? new Date(publishedMatch[1]) : new Date();
  const categories =
    categoriesMatch?.map((c) => {
      const match = c.match(/term="(.*?)"/);
      return match?.[1] || "";
    }) || [];

  return {
    arxivId,
    source: "arxiv" as const,
    title,
    authors,
    abstract,
    categories,
    pdfUrl: `https://arxiv.org/pdf/${arxivId}.pdf`,
    publishedDate,
    createdAt: new Date(),
  };
}

interface MedrxivDetailEntry {
  doi: string;
  title: string;
  authors: string;
  date: string;
  version: string;
  type: string;
  category: string;
  abstract: string;
}

async function fetchMedrxivMetadata(doi: string) {
  const response = await fetch(
    `https://api.medrxiv.org/details/medrxiv/${doi}/na/json`,
    {
      headers: { "User-Agent": "PaperReader/1.0 (research-paper-aggregator)" },
      signal: AbortSignal.timeout(30_000),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch from medrxiv API: ${response.status}`);
  }

  const data = await response.json();

  if (!data.collection || data.collection.length === 0) {
    throw new Error("Paper not found in medrxiv");
  }

  const entry: MedrxivDetailEntry = data.collection[data.collection.length - 1];

  const authors = entry.authors
    .split(/;\s*/)
    .map((a: string) => a.trim())
    .filter(Boolean);

  const apiCategory = entry.category.toLowerCase();
  const categoryInfo = MEDRXIV_CATEGORY_BY_API_NAME.get(apiCategory);
  const categoryId = categoryInfo
    ? categoryInfo.id
    : `medrxiv:${apiCategory.replace(/[\s/()]+/g, "-").replace(/-+/g, "-").replace(/(^-|-$)/g, "")}`;

  return {
    arxivId: doi,
    source: "medrxiv" as const,
    title: entry.title,
    authors,
    abstract: entry.abstract,
    categories: [categoryId],
    pdfUrl: `https://www.medrxiv.org/content/${doi}v${entry.version}.full.pdf`,
    publishedDate: new Date(entry.date),
    createdAt: new Date(),
  };
}

export async function POST(request: Request) {
  const { userId } = await auth();
  const log = createLogger({ route: "papers-fetch", userId: userId || "anonymous" });

  try {
    log.info("Fetching paper metadata");

    if (!userId) {
      log.warn("Unauthorized request");
      return apiError("Unauthorized", 401);
    }

    const rateLimited = await checkRateLimit(userId, "write");
    if (rateLimited) return rateLimited;

    const parsed = await parseRequestBody(request, papersFetchSchema);
    if (parsed.error) return parsed.error;
    const { arxivUrl } = parsed.data;

    const medrxivDoi = extractMedrxivDoi(arxivUrl);
    const paperId = medrxivDoi || extractArxivId(arxivUrl);

    if (!paperId) {
      log.warn({ arxivUrl }, "Invalid paper URL");
      return apiError("Invalid arXiv or medrxiv URL", 400);
    }

    const source = medrxivDoi ? "medrxiv" : "arxiv";
    log.debug({ arxivId: paperId, source }, "Extracted paper identifier");

    const papers = await getPapersCollection();
    const existing = await papers.findOne({ arxivId: paperId });

    if (existing) {
      log.info({ arxivId: paperId }, "Paper already exists in database");
      return apiResponse({ paper: existing });
    }

    log.info({ arxivId: paperId }, `Fetching metadata from ${source} API`);
    const metadata = medrxivDoi
      ? await fetchMedrxivMetadata(medrxivDoi)
      : await fetchArxivMetadata(paperId);

    const result = await papers.updateOne(
      { arxivId: paperId },
      { $setOnInsert: metadata },
      { upsert: true }
    );

    if (result.upsertedId) {
      log.info({ arxivId: paperId, paperId: result.upsertedId }, "Paper created successfully");
      return apiResponse({ paper: { _id: result.upsertedId, ...metadata } });
    }

    const finalPaper = await papers.findOne({ arxivId: paperId });
    log.info({ arxivId: paperId }, "Paper retrieved successfully");
    return apiResponse({ paper: finalPaper });
  } catch (error) {
    log.error({ err: error }, "Failed to fetch paper");
    return apiError("Failed to fetch paper", 500, error instanceof Error ? error.message : String(error));
  }
}
