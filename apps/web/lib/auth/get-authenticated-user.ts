import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getUsersCollection } from "@/lib/db/collections";
import { WithId } from "mongodb";
import { User } from "@/lib/types";
import { apiError } from "@/lib/api/errors";

type AuthResult =
  | { user: WithId<User>; error?: never }
  | { user?: never; error: NextResponse };

export async function getAuthenticatedUser(): Promise<AuthResult> {
  const { userId } = await auth();
  if (!userId) {
    return { error: apiError("Unauthorized", 401) };
  }

  const users = await getUsersCollection();
  const user = await users.findOne({ clerkId: userId });
  if (!user) {
    return { error: apiError("User not found", 404) };
  }

  return { user };
}
