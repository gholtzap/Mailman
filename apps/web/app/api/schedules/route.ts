import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getUsersCollection, getRecurringSchedulesCollection } from "@/lib/db/collections";

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await getUsersCollection();
  const user = await users.findOne({ clerkId: userId });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");

  const schedules = await getRecurringSchedulesCollection();

  const userSchedules = await schedules
    .find({ userId: user._id })
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limit)
    .toArray();

  const total = await schedules.countDocuments({ userId: user._id });

  return NextResponse.json({ schedules: userSchedules, total });
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, categories, papersPerCategory, intervalDays, email } = body;

    if (!name || !categories || categories.length === 0 || !papersPerCategory || !intervalDays) {
      return NextResponse.json(
        { error: "Missing required fields: name, categories, papersPerCategory, intervalDays" },
        { status: 400 }
      );
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    if (![1, 3, 7, 14, 30].includes(intervalDays)) {
      return NextResponse.json(
        { error: "intervalDays must be one of: 1, 3, 7, 14, 30" },
        { status: 400 }
      );
    }

    const users = await getUsersCollection();
    const user = await users.findOne({ clerkId: userId });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const schedules = await getRecurringSchedulesCollection();

    const now = new Date();
    const scheduleData: any = {
      userId: user._id!,
      name,
      categories,
      papersPerCategory,
      intervalDays,
      status: "active",
      nextRunAt: now,
      runCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    if (email) {
      scheduleData.email = email;
    }

    const schedule = await schedules.insertOne(scheduleData);

    const createdSchedule = await schedules.findOne({ _id: schedule.insertedId });

    return NextResponse.json({ success: true, schedule: createdSchedule });
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json(
        { error: "A schedule with this name already exists" },
        { status: 400 }
      );
    }
    console.error('[Schedules API] ERROR:', error);
    return NextResponse.json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
