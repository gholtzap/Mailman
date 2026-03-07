import { auth, currentUser } from "@clerk/nextjs/server";
import { createLogger } from "@/lib/logging";
import { apiError, apiResponse } from "@/lib/api/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { fetchDashboardData } from "@/lib/data/dashboard";
import { findOrCreateUser } from "@/lib/db/find-or-create-user";

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

    const clerkUser = await currentUser();
    const email = clerkUser?.emailAddresses[0]?.emailAddress || "";

    const user = await findOrCreateUser(userId, email);
    if (!user) {
      log.error("Failed to create user after insert");
      return apiError("Failed to create user", 500);
    }

    const data = await fetchDashboardData(user);

    log.debug("Dashboard data retrieved");

    return apiResponse(data);
  } catch (error) {
    log.error({ err: error }, "Dashboard API error");
    return apiError("Internal server error", 500, error instanceof Error ? error.message : "Unknown error");
  }
}
