import { WithId } from "mongodb";
import { getUsersCollection } from "./collections";
import { User } from "@/lib/types";

const DEFAULT_SETTINGS: User["settings"] = {
  defaultCategories: ["cs.AI", "cs.LG"],
  maxPagesPerPaper: 50,
  papersPerCategory: 5,
};

export async function findOrCreateUser(
  clerkId: string,
  email: string,
): Promise<WithId<User> | null> {
  const users = await getUsersCollection();
  const existing = await users.findOne({ clerkId });
  if (existing) return existing;

  const now = new Date();
  const result = await users.insertOne({
    clerkId,
    email,
    settings: { ...DEFAULT_SETTINGS },
    usage: {
      currentMonthPapersProcessed: 0,
      lastResetDate: now,
    },
    createdAt: now,
    updatedAt: now,
  });

  return users.findOne({ _id: result.insertedId });
}
