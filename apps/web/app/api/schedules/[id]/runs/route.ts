import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getRecurringSchedulesCollection, getProcessingJobsCollection } from "@/lib/db/collections";
import { getAuthenticatedUser } from "@/lib/auth/get-authenticated-user";

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
