import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getRecurringSchedulesCollection } from "@/lib/db/collections";
import { getAuthenticatedUser } from "@/lib/auth/get-authenticated-user";
import { apiError } from "@/lib/api/errors";
import { checkRateLimit } from "@/lib/rate-limit";

const EXPORT_FIELDS = [
  "name",
  "categories",
  "keywords",
  "keywordMatchMode",
  "papersPerCategory",
  "intervalDays",
  "scheduleType",
  "weekDays",
  "preferredHour",
  "timezone",
  "email",
  "status",
] as const;

export async function GET(request: Request) {
  try {
    const result = await getAuthenticatedUser();
    if (result.error) return result.error;
    const { user } = result;

    const rateLimited = await checkRateLimit(user.clerkId, "read");
    if (rateLimited) return rateLimited;

    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get("ids");

    const schedules = await getRecurringSchedulesCollection();

    const filter: Record<string, unknown> = { userId: user._id };
    if (idsParam) {
      const ids = idsParam.split(",").filter(Boolean);
      filter._id = { $in: ids.map((id) => new ObjectId(id)) };
    }

    const userSchedules = await schedules
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(500)
      .toArray();

    const exportedSchedules = userSchedules.map((schedule) => {
      const exported: Record<string, unknown> = {};
      for (const field of EXPORT_FIELDS) {
        if (schedule[field] !== undefined) {
          exported[field] = schedule[field];
        }
      }
      return exported;
    });

    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      schedules: exportedSchedules,
    };

    const dateStr = new Date().toISOString().split("T")[0];

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="schedules-export-${dateStr}.json"`,
      },
    });
  } catch (error) {
    console.error("[Schedules Export] ERROR:", error);
    return apiError(
      "Internal server error",
      500,
      error instanceof Error ? error.message : String(error)
    );
  }
}
