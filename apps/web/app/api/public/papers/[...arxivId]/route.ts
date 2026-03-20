import { NextResponse } from "next/server";
import { getPapersCollection, getProcessedPapersCollection } from "@/lib/db/collections";
import { apiError } from "@/lib/api/errors";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ arxivId: string[] }> }
) {
  const { arxivId: segments } = await params;
  if (!segments || segments.length === 0) {
    return apiError("arXiv ID is required", 400);
  }

  const arxivId = segments.join("/");

  const papers = await getPapersCollection();
  const paper = await papers.findOne({ arxivId });

  if (!paper) {
    return apiError("Paper not found", 404);
  }

  const processedPapers = await getProcessedPapersCollection();
  const processedPaper = await processedPapers.findOne(
    { paperId: paper._id, status: "completed" },
    { sort: { updatedAt: -1 }, projection: { userId: 0, folderId: 0, costs: 0 } }
  );

  if (!processedPaper) {
    return apiError("No summary available for this paper", 404);
  }

  return NextResponse.json({
    paper: {
      title: paper.title,
      authors: paper.authors,
      abstract: paper.abstract,
      categories: paper.categories,
      pdfUrl: paper.pdfUrl,
      publishedDate: paper.publishedDate,
      pageCount: paper.pageCount,
      source: paper.source,
      arxivId: paper.arxivId,
    },
    summary: processedPaper.generatedContent || null,
  });
}
