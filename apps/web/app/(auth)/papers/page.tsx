import { getUserForPage } from "@/lib/auth/get-user-for-page";
import { fetchPapers } from "@/lib/data/papers";
import { fetchFolders } from "@/lib/data/folders";
import PapersClient from "./PapersClient";

export default async function PapersPage() {
  const user = await getUserForPage();
  const [initialPapers, initialFolders] = await Promise.all([
    fetchPapers(user),
    fetchFolders(user),
  ]);

  return <PapersClient initialPapers={initialPapers} initialFolders={initialFolders} />;
}
