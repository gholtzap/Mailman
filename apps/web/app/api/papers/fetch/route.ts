import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getPapersCollection } from "@/lib/db/collections";
import { createLogger } from "@/lib/logging";

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
    title,
    authors,
    abstract,
    categories,
    pdfUrl: `https://arxiv.org/pdf/${arxivId}.pdf`,
    publishedDate,
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { arxivUrl } = body;

    const arxivId = extractArxivId(arxivUrl);
    if (!arxivId) {
      log.warn({ arxivUrl }, "Invalid arXiv URL");
      return NextResponse.json(
        { error: "Invalid arXiv URL" },
        { status: 400 }
      );
    }

    log.debug({ arxivId }, "Extracted arXiv ID");

    const papers = await getPapersCollection();
    const existing = await papers.findOne({ arxivId });

    if (existing) {
      log.info({ arxivId }, "Paper already exists in database");
      return NextResponse.json({ paper: existing });
    }

    log.info({ arxivId }, "Fetching metadata from arXiv API");
    const metadata = await fetchArxivMetadata(arxivId);
    const result = await papers.updateOne(
      { arxivId },
      { $setOnInsert: metadata },
      { upsert: true }
    );

    if (result.upsertedId) {
      log.info({ arxivId, paperId: result.upsertedId }, "Paper created successfully");
      return NextResponse.json({ paper: { _id: result.upsertedId, ...metadata } });
    }

    const finalPaper = await papers.findOne({ arxivId });
    log.info({ arxivId }, "Paper retrieved successfully");
    return NextResponse.json({ paper: finalPaper });
  } catch (error) {
    log.error({ err: error }, "Failed to fetch paper");
    return NextResponse.json({
      error: "Failed to fetch paper",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
