import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { getUsersCollection } from "@/lib/db/collections";
import { WithId } from "mongodb";
import { User } from "@/lib/types";

export async function getUserForPage(): Promise<WithId<User>> {
  const { userId } = await auth();
  if (!userId) {
    notFound();
  }

  const users = await getUsersCollection();
  const user = await users.findOne({ clerkId: userId });
  if (!user) {
    notFound();
  }

  return user;
}
