import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import { getUserForPage } from "@/lib/auth/get-user-for-page";
import { fetchPaperDetail } from "@/lib/data/papers";
import PaperDetailClient from "./PaperDetailClient";

export default async function PaperDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let objectId: ObjectId;
  try {
    objectId = new ObjectId(id);
  } catch {
    notFound();
  }

  const user = await getUserForPage();
  const data = await fetchPaperDetail(user, objectId);

  if (!data || !data.processedPaper || !data.paper) {
    notFound();
  }

  return <PaperDetailClient processedPaper={data.processedPaper} paper={data.paper} />;
}
