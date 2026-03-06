import { WithId } from "mongodb";
import { getFoldersCollection } from "@/lib/db/collections";
import { serialize } from "./serialize";
import { User } from "@/lib/types";

export async function fetchFolders(user: WithId<User>) {
  const folders = await getFoldersCollection();
  const userFolders = await folders
    .find({ userId: user._id })
    .sort({ order: 1 })
    .limit(100)
    .toArray();

  return serialize({ folders: userFolders });
}
