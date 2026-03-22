import { ObjectId, WithId } from "mongodb";
import { getProcessedPapersCollection, getPapersCollection } from "@/lib/db/collections";
import { serialize } from "./serialize";
import { User } from "@/lib/types";

interface PaperFilters {
  status?: string | null;
  category?: string | null;
  folderId?: string | null;
  limit?: number;
  offset?: number;
  sort?: string;
  sortDirection?: string;
  search?: string | null;
}

export async function fetchPapers(user: WithId<User>, filters: PaperFilters = {}) {
  const {
    status,
    category,
    folderId,
    limit = 100,
    offset = 0,
    sort = "createdAt",
    sortDirection = "desc",
    search,
  } = filters;

  const processedPapers = await getProcessedPapersCollection();

  const matchStage: Record<string, unknown> = { userId: user._id };
  if (status) matchStage.status = status;
  if (folderId === "unfiled") {
    matchStage.folderId = { $exists: false };
  } else if (folderId) {
    matchStage.folderId = new ObjectId(folderId);
  }

  const pipeline: Record<string, unknown>[] = [
    { $match: matchStage },
    {
      $lookup: {
        from: "papers",
        localField: "paperId",
        foreignField: "_id",
        as: "paperArr",
      },
    },
    { $unwind: { path: "$paperArr", preserveNullAndEmptyArrays: true } },
  ];

  const postLookupMatch: Record<string, unknown> = {};
  if (search) {
    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    postLookupMatch.$or = [
      { "paperArr.title": { $regex: escapedSearch, $options: "i" } },
      { "paperArr.authors": { $regex: escapedSearch, $options: "i" } },
    ];
  }
  if (category) {
    postLookupMatch["paperArr.categories"] = category;
  }
  if (Object.keys(postLookupMatch).length > 0) {
    pipeline.push({ $match: postLookupMatch });
  }

  const validSortFields: Record<string, string> = {
    title: "paperArr.title",
    createdAt: "createdAt",
    status: "status",
    category: "paperArr.categories",
  };
  const sortField = validSortFields[sort] || "createdAt";
  const sortDir = sortDirection === "asc" ? 1 : -1;
  pipeline.push({ $sort: { [sortField]: sortDir } });
  pipeline.push({ $skip: offset });
  pipeline.push({ $limit: Math.min(limit, 200) });
  pipeline.push({
    $project: {
      _id: 1, userId: 1, paperId: 1, arxivId: 1, folderId: 1, skipAI: 1,
      status: 1, generatedContent: 1, costs: 1, error: 1, createdAt: 1, updatedAt: 1,
      paper: "$paperArr",
    },
  });

  const results = await processedPapers.aggregate(pipeline).toArray();
  return serialize({ papers: results });
}

export async function fetchPaperDetail(user: WithId<User>, paperId: ObjectId) {
  const processedPapers = await getProcessedPapersCollection();
  const processedPaper = await processedPapers.findOne({
    _id: paperId,
    userId: user._id,
  });

  if (!processedPaper) return null;

  const papers = await getPapersCollection();
  const paper = await papers.findOne({ _id: processedPaper.paperId });

  return serialize({ processedPaper, paper });
}
