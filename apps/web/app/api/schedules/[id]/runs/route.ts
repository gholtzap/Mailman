import { NextResponse, after } from "next/server";
import { getRecurringSchedulesCollection, getProcessingJobsCollection, getUsersCollection } from "@/lib/db/collections";
import { getAuthenticatedUser } from "@/lib/auth/get-authenticated-user";
import { parseRouteParams } from "@/lib/validation/parse-route-params";
import { apiError } from "@/lib/api/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { processBatchScrape } from "@/lib/processing/batch";
import { migrateApiKeyIfLegacy } from "@/lib/encryption";

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

export const maxDuration = 300;

export async function POST(
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

  let skipAI = false;
  try {
    const body = await request.json();
    if (body.skipAI === true) skipAI = true;
  } catch {
    // no body is fine
  }

  const schedules = await getRecurringSchedulesCollection();
  const schedule = await schedules.findOne({
    _id: parsed.id,
    userId: user._id,
  });

  if (!schedule) {
    return apiError("Schedule not found", 404);
  }

  const users = await getUsersCollection();
  const freshUser = await users.findOne({ _id: user._id });
  if (!freshUser) {
    return apiError("User not found", 404);
  }

  const jobs = await getProcessingJobsCollection();
  const jobInput: Record<string, unknown> = {
    categories: schedule.categories,
    papersPerCategory: schedule.papersPerCategory,
    skipAI,
  };
  if (schedule.keywords !== undefined) jobInput.keywords = schedule.keywords;
  if (schedule.keywordMatchMode !== undefined) jobInput.keywordMatchMode = schedule.keywordMatchMode;

  const job = await jobs.insertOne({
    userId: user._id!,
    scheduleId: schedule._id,
    type: "batch_scrape",
    status: "queued",
    input: jobInput,
    progress: {
      total: schedule.categories.length * schedule.papersPerCategory,
      completed: 0,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const encryptedApiKey = freshUser.apiKey
    ? await migrateApiKeyIfLegacy(freshUser._id!, freshUser.apiKey)
    : null;

  after(() =>
    processBatchScrape({
      jobId: job.insertedId.toString(),
      userId: user._id!,
      categories: schedule.categories,
      papersPerCategory: schedule.papersPerCategory,
      keywords: schedule.keywords,
      keywordMatchMode: schedule.keywordMatchMode,
      encryptedApiKey,
      skipAI,
      notificationEmail: schedule.email || freshUser.email,
      scheduleName: schedule.name,
    })
  );

  await schedules.updateOne(
    { _id: schedule._id },
    {
      $set: {
        lastRunAt: new Date(),
        lastRunJobId: job.insertedId,
        updatedAt: new Date(),
      },
      $inc: { runCount: 1 },
    }
  );

  return NextResponse.json({
    success: true,
    jobId: job.insertedId,
    skipAI,
  });
}
