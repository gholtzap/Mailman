import { NextResponse } from "next/server";
import { getProcessingJobsCollection } from "@/lib/db/collections";
import { getAuthenticatedUser } from "@/lib/auth/get-authenticated-user";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const result = await getAuthenticatedUser();
  if (result.error) return result.error;
  const { user } = result;

  const rateLimited = await checkRateLimit(user.clerkId, "read");
  if (rateLimited) return rateLimited;

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const type = url.searchParams.get("type");

  const jobs = await getProcessingJobsCollection();

  const filter: Record<string, unknown> = { userId: user._id };
  if (status && status !== "all") {
    filter.status = status;
  }
  if (type && type !== "all") {
    filter.type = type;
  }

  const results = await jobs
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();

  return NextResponse.json({ jobs: results });
}
