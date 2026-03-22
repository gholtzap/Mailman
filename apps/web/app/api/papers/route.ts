import { getAuthenticatedUser } from "@/lib/auth/get-authenticated-user";
import { checkRateLimit } from "@/lib/rate-limit";
import { fetchPapers } from "@/lib/data/papers";
import { apiResponse } from "@/lib/api/errors";

export async function GET(request: Request) {
  const result = await getAuthenticatedUser();
  if (result.error) return result.error;
  const { user } = result;

  const rateLimited = await checkRateLimit(user.clerkId, "read");
  if (rateLimited) return rateLimited;

  const { searchParams } = new URL(request.url);

  const data = await fetchPapers(user, {
    status: searchParams.get("status"),
    category: searchParams.get("category"),
    folderId: searchParams.get("folderId"),
    limit: Math.min(parseInt(searchParams.get("limit") || "100"), 200),
    offset: parseInt(searchParams.get("offset") || "0"),
    sort: searchParams.get("sort") || "createdAt",
    sortDirection: searchParams.get("sortDirection") || "desc",
    search: searchParams.get("search"),
  });

  return apiResponse(data);
}
