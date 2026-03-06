import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getUsersCollection } from "@/lib/db/collections";
import { createLogger } from "@/lib/logging";
import { apiError } from "@/lib/api/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { fetchDashboardData } from "@/lib/data/dashboard";

export async function GET() {
  const { userId } = await auth();
  const log = createLogger({ route: "dashboard", userId: userId || "anonymous" });

  try {
    log.info("Fetching dashboard data");

    if (!userId) {
      log.warn("Unauthorized request");
      return apiError("Unauthorized", 401);
    }

    const rateLimited = await checkRateLimit(userId, "read");
    if (rateLimited) return rateLimited;

    const users = await getUsersCollection();
    let user = await users.findOne({ clerkId: userId });

    if (!user) {
      log.info("User not found, creating new user");
      const clerkUser = await currentUser();
      const email = clerkUser?.emailAddresses[0]?.emailAddress || "";

      const result = await users.insertOne({
        clerkId: userId,
        email,
        settings: {
          defaultCategories: ["cs.AI", "cs.LG"],
          maxPagesPerPaper: 50,
          papersPerCategory: 5,
        },
        usage: {
          currentMonthPapersProcessed: 0,
          lastResetDate: new Date(),
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      user = await users.findOne({ _id: result.insertedId });
      if (!user) {
        log.error("Failed to create user after insert");
        return apiError("Failed to create user", 500);
      }
      log.info({ dbUserId: user._id }, "User created successfully");
    }

    const data = await fetchDashboardData(user);

    log.debug("Dashboard data retrieved");

    return NextResponse.json(data);
  } catch (error) {
    log.error({ err: error }, "Dashboard API error");
    return apiError("Internal server error", 500, error instanceof Error ? error.message : "Unknown error");
  }
}
