import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getRecurringSchedulesCollection } from "@/lib/db/collections";
import { computeNextRunAt } from "@/lib/scheduling/next-run";
import { getAuthenticatedUser } from "@/lib/auth/get-authenticated-user";
import { parseRequestBody } from "@/lib/validation/parse-request";
import { scheduleUpdateSchema, validateScheduleTiming } from "@/lib/validation/schemas/schedules";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await getAuthenticatedUser();
  if (result.error) return result.error;
  const { user } = result;

  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid schedule ID" }, { status: 400 });
  }

  const schedules = await getRecurringSchedulesCollection();
  const schedule = await schedules.findOne({
    _id: new ObjectId(id),
    userId: user._id,
  });

  if (!schedule) {
    return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
  }

  return NextResponse.json({ schedule });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult.error) return authResult.error;
    const { user } = authResult;

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid schedule ID" }, { status: 400 });
    }

    const parsed = await parseRequestBody(request, scheduleUpdateSchema);
    if (parsed.error) return parsed.error;
    const {
      name,
      categories,
      papersPerCategory,
      intervalDays,
      status,
      email,
      scheduleType,
      weekDays,
      preferredHour,
      timezone,
    } = parsed.data;

    const updateFields: any = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateFields.name = name;
    if (categories !== undefined) updateFields.categories = categories;
    if (papersPerCategory !== undefined) updateFields.papersPerCategory = papersPerCategory;

    const hasTimingChange =
      intervalDays !== undefined ||
      scheduleType !== undefined ||
      weekDays !== undefined ||
      preferredHour !== undefined ||
      timezone !== undefined;

    if (hasTimingChange) {
      const schedulesCol = await getRecurringSchedulesCollection();
      const existing = await schedulesCol.findOne({
        _id: new ObjectId(id),
        userId: user._id,
      });

      if (!existing) {
        return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
      }

      const effectiveScheduleType = scheduleType ?? existing.scheduleType ?? "interval";
      const effectiveIntervalDays =
        effectiveScheduleType === "weekly"
          ? 7
          : (intervalDays ?? existing.intervalDays);
      const effectiveWeekDays = weekDays ?? existing.weekDays ?? [];
      const effectivePreferredHour = preferredHour ?? existing.preferredHour ?? 6;
      const effectiveTimezone = timezone ?? existing.timezone ?? "UTC";

      const validationError = validateScheduleTiming({
        scheduleType: effectiveScheduleType,
        intervalDays: effectiveIntervalDays,
        weekDays: effectiveWeekDays,
        preferredHour: effectivePreferredHour,
        timezone: effectiveTimezone,
      });

      if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 });
      }

      if (intervalDays !== undefined || scheduleType !== undefined) {
        updateFields.intervalDays = effectiveIntervalDays;
      }
      if (scheduleType !== undefined) updateFields.scheduleType = effectiveScheduleType;
      if (weekDays !== undefined) updateFields.weekDays = weekDays;
      if (preferredHour !== undefined) updateFields.preferredHour = effectivePreferredHour;
      if (timezone !== undefined) updateFields.timezone = effectiveTimezone;

      if (existing.status === "active") {
        updateFields.nextRunAt = computeNextRunAt({
          scheduleType: effectiveScheduleType,
          intervalDays: effectiveIntervalDays,
          weekDays: effectiveWeekDays,
          preferredHour: effectivePreferredHour,
          timezone: effectiveTimezone,
          afterDate: new Date(),
        });
      }
    }

    if (status !== undefined) {
      updateFields.status = status;
    }
    if (email !== undefined) {
      updateFields.email = email || null;
    }

    const schedules = await getRecurringSchedulesCollection();
    const result = await schedules.findOneAndUpdate(
      { _id: new ObjectId(id), userId: user._id },
      { $set: updateFields },
      { returnDocument: "after" }
    );

    if (!result) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, schedule: result });
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json(
        { error: "A schedule with this name already exists" },
        { status: 400 }
      );
    }
    console.error('[Schedule Update API] ERROR:', error);
    return NextResponse.json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult.error) return authResult.error;
    const { user } = authResult;

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid schedule ID" }, { status: 400 });
    }

    const schedules = await getRecurringSchedulesCollection();
    const result = await schedules.deleteOne({
      _id: new ObjectId(id),
      userId: user._id,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Schedule Delete API] ERROR:', error);
    return NextResponse.json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
