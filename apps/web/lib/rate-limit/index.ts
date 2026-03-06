import { getDatabase } from "@/lib/db/mongodb";
import { apiError } from "@/lib/api/errors";
import { NextResponse } from "next/server";

const TIERS = {
  processing: { maxRequests: 10, windowMs: 60_000 },
  write: { maxRequests: 30, windowMs: 60_000 },
  read: { maxRequests: 60, windowMs: 60_000 },
} as const;

export type RateLimitTier = keyof typeof TIERS;

export async function checkRateLimit(
  userId: string,
  tier: RateLimitTier
): Promise<NextResponse | null> {
  if (process.env.NODE_ENV === "development") {
    return null;
  }

  const { maxRequests, windowMs } = TIERS[tier];
  const windowStart = Math.floor(Date.now() / windowMs);
  const key = `${userId}:${tier}:${windowStart}`;

  const db = await getDatabase();
  const result = await db.collection("rate_limits").findOneAndUpdate(
    { key },
    {
      $inc: { count: 1 },
      $setOnInsert: { expiresAt: new Date(Date.now() + windowMs * 2) },
    },
    { upsert: true, returnDocument: "after" }
  );

  if (result && result.count > maxRequests) {
    return apiError("Too many requests. Please try again later.", 429);
  }

  return null;
}
