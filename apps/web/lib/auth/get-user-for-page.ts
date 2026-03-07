import { auth, currentUser } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { findOrCreateUser } from "@/lib/db/find-or-create-user";
import { WithId } from "mongodb";
import { User } from "@/lib/types";

export async function getUserForPage(): Promise<WithId<User>> {
  const { userId } = await auth();
  if (!userId) {
    notFound();
  }

  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses[0]?.emailAddress || "";

  const user = await findOrCreateUser(userId, email);
  if (!user) {
    notFound();
  }

  return user;
}
