import { WithId } from "mongodb";
import { getProcessingJobsCollection } from "@/lib/db/collections";
import { serialize } from "./serialize";
import { User } from "@/lib/types";

interface JobFilters {
  status?: string | null;
  type?: string | null;
}

export async function fetchJobs(user: WithId<User>, filters: JobFilters = {}) {
  const { status, type } = filters;

  const jobs = await getProcessingJobsCollection();

  const filter: Record<string, unknown> = { userId: user._id };
  if (status && status !== "all") filter.status = status;
  if (type && type !== "all") filter.type = type;

  const results = await jobs
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();

  return serialize({ jobs: results });
}
