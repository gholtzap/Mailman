import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getPapersCollection } from "@/lib/db/collections";

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
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { arxivUrl } = body;

    const arxivId = extractArxivId(arxivUrl);
    if (!arxivId) {
      return NextResponse.json(
        { error: "Invalid arXiv URL" },
        { status: 400 }
      );
    }

    const papers = await getPapersCollection();
    const existing = await papers.findOne({ arxivId });

    if (existing) {
      return NextResponse.json({ paper: existing });
    }

    const metadata = await fetchArxivMetadata(arxivId);
    await papers.insertOne(metadata);

    return NextResponse.json({ paper: metadata });
  } catch (error) {
    console.error('[Papers Fetch API] ERROR:', error);
    return NextResponse.json({
      error: "Failed to fetch paper",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
