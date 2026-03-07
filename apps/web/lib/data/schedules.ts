import { WithId } from "mongodb";
import { getRecurringSchedulesCollection } from "@/lib/db/collections";
import { serialize } from "./serialize";
import { User } from "@/lib/types";

export async function fetchSchedules(user: WithId<User>, options?: { limit?: number; offset?: number }) {
  const schedules = await getRecurringSchedulesCollection();
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  const query = { userId: user._id };

  const [userSchedules, total] = await Promise.all([
    schedules
      .find(query)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray(),
    schedules.countDocuments(query),
  ]);

  return serialize({ schedules: userSchedules, total });
}
