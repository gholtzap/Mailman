import { NextResponse } from "next/server";
import { getRecurringSchedulesCollection } from "@/lib/db/collections";
import { getAuthenticatedUser } from "@/lib/auth/get-authenticated-user";
import { parseRequestBody } from "@/lib/validation/parse-request";
import { scheduleCreateSchema, validateScheduleTiming } from "@/lib/validation/schemas/schedules";
import { apiError } from "@/lib/api/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { fetchSchedules } from "@/lib/data/schedules";

export async function GET(request: Request) {
  const result = await getAuthenticatedUser();
  if (result.error) return result.error;
  const { user } = result;

  const rateLimited = await checkRateLimit(user.clerkId, "read");
  if (rateLimited) return rateLimited;

  const { searchParams } = new URL(request.url);
  const data = await fetchSchedules(user, {
    limit: searchParams.has("limit") ? parseInt(searchParams.get("limit")!) : undefined,
    offset: searchParams.has("offset") ? parseInt(searchParams.get("offset")!) : undefined,
  });

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  try {
    const result = await getAuthenticatedUser();
    if (result.error) return result.error;
    const { user } = result;

    const rateLimited = await checkRateLimit(user.clerkId, "write");
    if (rateLimited) return rateLimited;

    const parsed = await parseRequestBody(request, scheduleCreateSchema);
    if (parsed.error) return parsed.error;
    const {
      name,
      categories,
      papersPerCategory,
      intervalDays,
      email,
      keywords,
      keywordMatchMode,
      scheduleType,
      weekDays,
      preferredHour,
      timezone,
    } = parsed.data;

    const effectiveScheduleType = scheduleType ?? "interval";
    const effectiveIntervalDays = effectiveScheduleType === "weekly" ? 7 : intervalDays;

    if (effectiveScheduleType === "interval" && !effectiveIntervalDays) {
      return apiError("Missing required fields: name, categories, papersPerCategory, intervalDays", 400);
    }

    const validationError = validateScheduleTiming({
      scheduleType: effectiveScheduleType,
      intervalDays: effectiveIntervalDays,
      weekDays,
      preferredHour,
      timezone,
    });

    if (validationError) {
      return apiError(validationError, 400);
    }

    const schedules = await getRecurringSchedulesCollection();

    const now = new Date();
    const scheduleData: any = {
      userId: user._id!,
      name,
      categories,
      papersPerCategory,
      intervalDays: effectiveIntervalDays,
      scheduleType: effectiveScheduleType,
      preferredHour: preferredHour ?? 6,
      timezone: timezone ?? "UTC",
      status: "active",
      nextRunAt: now,
      runCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    if (effectiveScheduleType === "weekly" && weekDays) {
      scheduleData.weekDays = weekDays;
    }

    if (email) {
      scheduleData.email = email;
    }

    if (keywords !== undefined) {
      scheduleData.keywords = keywords;
    }

    if (keywordMatchMode !== undefined) {
      scheduleData.keywordMatchMode = keywordMatchMode;
    }

    const schedule = await schedules.insertOne(scheduleData);

    const createdSchedule = await schedules.findOne({ _id: schedule.insertedId });

    return NextResponse.json({ success: true, schedule: createdSchedule });
  } catch (error: any) {
    if (error.code === 11000) {
      return apiError("A schedule with this name already exists", 400);
    }
    console.error('[Schedules API] ERROR:', error);
    return apiError("Internal server error", 500, error instanceof Error ? error.message : String(error));
  }
}
