import { createLogger } from "@/lib/logging";
import {
  MEDRXIV_CATEGORY_BY_ID,
  MEDRXIV_CATEGORY_BY_API_NAME,
} from "@/lib/medrxiv-categories";
import type { PaperSource } from "@/lib/types";

export interface MedrxivPaper {
  arxivId: string;
  source: PaperSource;
  title: string;
  authors: string[];
  abstract: string;
  categories: string[];
  pdfUrl: string;
  publishedDate: Date;
  createdAt: Date;
}

interface MedrxivApiEntry {
  doi: string;
  title: string;
  authors: string;
  date: string;
  version: string;
  type: string;
  category: string;
  abstract: string;
  server: string;
}

interface MedrxivApiResponse {
  messages: Array<{
    status: string;
    interval: string;
    cursor: number;
    count: number;
    total: number;
  }>;
  collection: MedrxivApiEntry[];
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function parseAuthors(raw: string): string[] {
  return raw
    .split(/;\s*/)
    .map((a) => a.trim())
    .filter(Boolean);
}

export async function fetchMedrxivPapers(
  categoryIds: string[],
  papersPerCategory: number,
  log: ReturnType<typeof createLogger>
): Promise<MedrxivPaper[]> {
  const requestedCategories = new Map<string, string>();
  for (const id of categoryIds) {
    const cat = MEDRXIV_CATEGORY_BY_ID.get(id);
    if (!cat) {
      log.warn({ categoryId: id }, "Unknown medrxiv category ID, skipping");
      continue;
    }
    requestedCategories.set(cat.apiCategory, id);
  }

  if (requestedCategories.size === 0) {
    return [];
  }

  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 14);
  const fromStr = formatDate(from);
  const toStr = formatDate(to);

  const papersByCategory = new Map<string, MedrxivPaper[]>();
  for (const apiCat of requestedCategories.keys()) {
    papersByCategory.set(apiCat, []);
  }

  let cursor = 0;
  let totalAvailable = Infinity;

  const allCategoriesFull = () => {
    for (const papers of papersByCategory.values()) {
      if (papers.length < papersPerCategory) return false;
    }
    return true;
  };

  const MAX_API_PAGES = 20;
  let pagesScanned = 0;

  while (cursor < totalAvailable && !allCategoriesFull() && pagesScanned < MAX_API_PAGES) {
    pagesScanned++;
    const url = `https://api.medrxiv.org/details/medrxiv/${fromStr}/${toStr}/${cursor}/json`;

    log.debug({ url, cursor, totalAvailable }, "Fetching medrxiv API page");

    const response = await fetch(url, {
      headers: {
        "User-Agent": "PaperReader/1.0 (research-paper-aggregator)",
      },
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch papers from medrxiv: ${response.status}`
      );
    }

    const data: MedrxivApiResponse = await response.json();

    if (!data.messages?.[0] || data.messages[0].status !== "ok") {
      log.warn(
        { response: data.messages },
        "medrxiv API returned non-ok status"
      );
      break;
    }

    totalAvailable = data.messages[0].total;

    if (!data.collection || data.collection.length === 0) {
      break;
    }

    for (const entry of data.collection) {
      if (entry.type === "WITHDRAWN") continue;

      const apiCategory = entry.category.toLowerCase();
      if (!requestedCategories.has(apiCategory)) continue;

      const categoryPapers = papersByCategory.get(apiCategory)!;
      if (categoryPapers.length >= papersPerCategory) continue;

      const categoryId = requestedCategories.get(apiCategory)!;

      categoryPapers.push({
        arxivId: entry.doi,
        source: "medrxiv",
        title: entry.title,
        authors: parseAuthors(entry.authors),
        abstract: entry.abstract,
        categories: [categoryId],
        pdfUrl: `https://www.medrxiv.org/content/${entry.doi}v${entry.version}.full.pdf`,
        publishedDate: new Date(entry.date),
        createdAt: new Date(),
      });
    }

    cursor += data.collection.length;
  }

  if (pagesScanned >= MAX_API_PAGES && !allCategoriesFull()) {
    log.warn(
      { pagesScanned, cursor, totalAvailable },
      "Reached medrxiv API pagination limit before filling all categories"
    );
  }

  const allPapers: MedrxivPaper[] = [];
  for (const [apiCat, papers] of papersByCategory) {
    const categoryId = requestedCategories.get(apiCat)!;
    log.info(
      {
        category: categoryId,
        fetched: papers.length,
        requested: papersPerCategory,
      },
      "Fetched medrxiv papers for category"
    );
    allPapers.push(...papers);
  }

  log.info(
    {
      totalPapers: allPapers.length,
      categoriesRequested: requestedCategories.size,
      dateRange: `${fromStr} to ${toStr}`,
      apiPagesScanned: Math.ceil(cursor / 100) || 1,
    },
    "medrxiv fetch complete"
  );

  return allPapers;
}
