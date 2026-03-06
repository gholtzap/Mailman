import { NextResponse } from "next/server";
import { getProcessedPapersCollection } from "@/lib/db/collections";
import { getAuthenticatedUser } from "@/lib/auth/get-authenticated-user";
import { parseRouteParams } from "@/lib/validation/parse-route-params";
import { apiError } from "@/lib/api/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { fetchPaperDetail } from "@/lib/data/papers";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await getAuthenticatedUser();
  if (result.error) return result.error;
  const { user } = result;

  const rateLimited = await checkRateLimit(user.clerkId, "read");
  if (rateLimited) return rateLimited;

  const parsed = await parseRouteParams(params);
  if (parsed.error) return parsed.error;

  const data = await fetchPaperDetail(user, parsed.id);

  if (!data) {
    return apiError("Paper not found", 404);
  }

  return NextResponse.json(data);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await getAuthenticatedUser();
  if (authResult.error) return authResult.error;
  const { user } = authResult;

  const rateLimited = await checkRateLimit(user.clerkId, "write");
  if (rateLimited) return rateLimited;

  const parsed = await parseRouteParams(params);
  if (parsed.error) return parsed.error;

  const processedPapers = await getProcessedPapersCollection();
  const result = await processedPapers.findOneAndDelete({
    _id: parsed.id,
    userId: user._id,
  });

  if (!result) {
    return apiError("Paper not found", 404);
  }

  return NextResponse.json({ success: true });
}
