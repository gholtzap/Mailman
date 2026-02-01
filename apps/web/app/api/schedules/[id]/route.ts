import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getUsersCollection, getRecurringSchedulesCollection } from "@/lib/db/collections";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await getUsersCollection();
  const user = await users.findOne({ clerkId: userId });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

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
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const users = await getUsersCollection();
    const user = await users.findOne({ clerkId: userId });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid schedule ID" }, { status: 400 });
    }

    const body = await request.json();
    const { name, categories, papersPerCategory, intervalDays, status } = body;

    const updateFields: any = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateFields.name = name;
    if (categories !== undefined) updateFields.categories = categories;
    if (papersPerCategory !== undefined) updateFields.papersPerCategory = papersPerCategory;
    if (intervalDays !== undefined) {
      if (![1, 3, 7, 14, 30].includes(intervalDays)) {
        return NextResponse.json(
          { error: "intervalDays must be one of: 1, 3, 7, 14, 30" },
          { status: 400 }
        );
      }
      updateFields.intervalDays = intervalDays;
    }
    if (status !== undefined) {
      if (!["active", "paused"].includes(status)) {
        return NextResponse.json(
          { error: "status must be either 'active' or 'paused'" },
          { status: 400 }
        );
      }
      updateFields.status = status;
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
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const users = await getUsersCollection();
    const user = await users.findOne({ clerkId: userId });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

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
