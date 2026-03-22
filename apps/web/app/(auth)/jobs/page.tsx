import { getUserForPage } from "@/lib/auth/get-user-for-page";
import { fetchJobs } from "@/lib/data/jobs";
import JobsClient from "./JobsClient";

export default async function JobsPage() {
  const user = await getUserForPage();
  const initialData = await fetchJobs(user);

  return <JobsClient initialData={initialData} />;
}
