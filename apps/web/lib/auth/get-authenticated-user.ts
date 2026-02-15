import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getUsersCollection } from "@/lib/db/collections";
import { WithId } from "mongodb";
import { User } from "@/lib/types";

type AuthResult =
  | { user: WithId<User>; error?: never }
  | { user?: never; error: NextResponse };

export async function getAuthenticatedUser(): Promise<AuthResult> {
  const { userId } = await auth();
  if (!userId) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const users = await getUsersCollection();
  const user = await users.findOne({ clerkId: userId });
  if (!user) {
    return {
      error: NextResponse.json({ error: "User not found" }, { status: 404 }),
    };
  }

  return { user };
}
