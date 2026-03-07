import { getAuthenticatedUser } from "@/lib/auth/get-authenticated-user";
import { checkRateLimit } from "@/lib/rate-limit";
import { fetchJobs } from "@/lib/data/jobs";
import { apiResponse } from "@/lib/api/errors";

export async function GET(request: Request) {
  const result = await getAuthenticatedUser();
  if (result.error) return result.error;
  const { user } = result;

  const rateLimited = await checkRateLimit(user.clerkId, "read");
  if (rateLimited) return rateLimited;

  const url = new URL(request.url);

  const data = await fetchJobs(user, {
    status: url.searchParams.get("status"),
    type: url.searchParams.get("type"),
  });

  return apiResponse(data);
}
