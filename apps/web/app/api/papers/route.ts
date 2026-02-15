import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getProcessedPapersCollection } from "@/lib/db/collections";
import { getAuthenticatedUser } from "@/lib/auth/get-authenticated-user";

export async function GET(request: Request) {
  const result = await getAuthenticatedUser();
  if (result.error) return result.error;
  const { user } = result;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const category = searchParams.get("category");
  const folderId = searchParams.get("folderId");
  const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 200);
  const offset = parseInt(searchParams.get("offset") || "0");
  const sort = searchParams.get("sort") || "createdAt";
  const sortDirection = searchParams.get("sortDirection") === "asc" ? 1 : -1;
  const search = searchParams.get("search");

  const processedPapers = await getProcessedPapersCollection();

  const matchStage: any = { userId: user._id };
  if (status) {
    matchStage.status = status;
  }
  if (folderId === "unfiled") {
    matchStage.folderId = { $exists: false };
  } else if (folderId) {
    matchStage.folderId = new ObjectId(folderId);
  }

  const pipeline: any[] = [
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

  const postLookupMatch: any = {};

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
  pipeline.push({ $sort: { [sortField]: sortDirection } });

  pipeline.push({ $skip: offset });
  pipeline.push({ $limit: limit });

  pipeline.push({
    $project: {
      _id: 1,
      userId: 1,
      paperId: 1,
      arxivId: 1,
      folderId: 1,
      skipAI: 1,
      status: 1,
      generatedContent: 1,
      humanizedContent: 1,
      costs: 1,
      error: 1,
      createdAt: 1,
      updatedAt: 1,
      paper: "$paperArr",
    },
  });

  const results = await processedPapers.aggregate(pipeline).toArray();

  return NextResponse.json({ papers: results });
}
