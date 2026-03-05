import { NextResponse } from "next/server";
import { OptionalId } from "mongodb";
import { getRecurringSchedulesCollection } from "@/lib/db/collections";
import { getAuthenticatedUser } from "@/lib/auth/get-authenticated-user";
import { getClient } from "@/lib/db/mongodb";
import { parseRequestBody } from "@/lib/validation/parse-request";
import {
  scheduleImportSchema,
  validateScheduleTiming,
} from "@/lib/validation/schemas/schedules";
import { computeNextRunAt } from "@/lib/scheduling/next-run";
import { apiError } from "@/lib/api/errors";
import { RecurringSchedule } from "@/lib/types";

function findUniqueName(desired: string, existingNames: Set<string>): string {
  if (!existingNames.has(desired)) return desired;
  let suffix = 2;
  while (existingNames.has(`${desired} (${suffix})`)) {
    suffix++;
  }
  return `${desired} (${suffix})`;
}

export async function POST(request: Request) {
  try {
    const result = await getAuthenticatedUser();
    if (result.error) return result.error;
    const { user } = result;

    const parsed = await parseRequestBody(request, scheduleImportSchema);
    if (parsed.error) return parsed.error;
    const { schedules: importedSchedules } = parsed.data;

    const schedulesCollection = await getRecurringSchedulesCollection();

    const existingDocs = await schedulesCollection
      .find({ userId: user._id }, { projection: { name: 1 } })
      .limit(10000)
      .toArray();
    const existingNames = new Set(existingDocs.map((d) => d.name));

    const now = new Date();
    const renamed: { original: string; renamed: string }[] = [];
    const docsToInsert: OptionalId<RecurringSchedule>[] = [];

    for (const schedule of importedSchedules) {
      const effectiveScheduleType = schedule.scheduleType ?? "interval";
      const effectiveIntervalDays =
        effectiveScheduleType === "weekly" ? 7 : schedule.intervalDays;

      if (effectiveScheduleType === "interval" && !effectiveIntervalDays) {
        return apiError(
          `Schedule "${schedule.name}" is missing intervalDays`,
          400
        );
      }

      const validationError = validateScheduleTiming({
        scheduleType: effectiveScheduleType,
        intervalDays: effectiveIntervalDays,
        weekDays: schedule.weekDays,
        preferredHour: schedule.preferredHour,
        timezone: schedule.timezone,
      });

      if (validationError) {
        return apiError(
          `Schedule "${schedule.name}": ${validationError}`,
          400
        );
      }

      const uniqueName = findUniqueName(schedule.name, existingNames);
      if (uniqueName !== schedule.name) {
        renamed.push({ original: schedule.name, renamed: uniqueName });
      }
      existingNames.add(uniqueName);

      const nextRunAt = computeNextRunAt({
        scheduleType: effectiveScheduleType,
        intervalDays: effectiveIntervalDays ?? 1,
        weekDays: schedule.weekDays ?? [],
        preferredHour: schedule.preferredHour ?? 6,
        timezone: schedule.timezone ?? "UTC",
        afterDate: now,
      });

      const doc: OptionalId<RecurringSchedule> = {
        userId: user._id,
        name: uniqueName,
        categories: schedule.categories,
        papersPerCategory: schedule.papersPerCategory,
        intervalDays: effectiveIntervalDays ?? 1,
        scheduleType: effectiveScheduleType,
        preferredHour: schedule.preferredHour ?? 6,
        timezone: schedule.timezone ?? "UTC",
        status: schedule.status ?? "active",
        nextRunAt,
        runCount: 0,
        createdAt: now,
        updatedAt: now,
      };

      if (effectiveScheduleType === "weekly" && schedule.weekDays) {
        doc.weekDays = schedule.weekDays;
      }
      if (schedule.email) {
        doc.email = schedule.email;
      }
      if (schedule.keywords !== undefined) {
        doc.keywords = schedule.keywords;
      }
      if (schedule.keywordMatchMode !== undefined) {
        doc.keywordMatchMode = schedule.keywordMatchMode;
      }

      docsToInsert.push(doc);
    }

    const client = await getClient();
    const session = client.startSession();
    try {
      await session.withTransaction(async () => {
        await schedulesCollection.insertMany(docsToInsert, { session });
      });
    } finally {
      await session.endSession();
    }

    return NextResponse.json({
      imported: docsToInsert.length,
      renamed,
    });
  } catch (error: any) {
    console.error("[Schedules Import] ERROR:", error);
    return apiError(
      "Internal server error",
      500,
      error instanceof Error ? error.message : String(error)
    );
  }
}
