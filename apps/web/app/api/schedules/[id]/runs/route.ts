import { NextResponse } from "next/server";
import { getRecurringSchedulesCollection, getProcessingJobsCollection } from "@/lib/db/collections";
import { getAuthenticatedUser } from "@/lib/auth/get-authenticated-user";
import { parseRouteParams } from "@/lib/validation/parse-route-params";
import { apiError } from "@/lib/api/errors";
import { checkRateLimit } from "@/lib/rate-limit";

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

  const schedules = await getRecurringSchedulesCollection();
  const schedule = await schedules.findOne({
    _id: parsed.id,
    userId: user._id,
  });

  if (!schedule) {
    return apiError("Schedule not found", 404);
  }

  const url = new URL(request.url);
  const limitParam = parseInt(url.searchParams.get("limit") || "20", 10);
  const limit = Math.min(Math.max(1, limitParam), 50);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const skip = (page - 1) * limit;

  const jobs = await getProcessingJobsCollection();
  const runs = await jobs
    .find({ scheduleId: schedule._id })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();

  const total = await jobs.countDocuments({ scheduleId: schedule._id });

  return NextResponse.json({
    runs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
