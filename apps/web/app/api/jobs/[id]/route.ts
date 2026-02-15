import { NextResponse } from "next/server";
import { getProcessingJobsCollection } from "@/lib/db/collections";
import { getAuthenticatedUser } from "@/lib/auth/get-authenticated-user";
import { parseRouteParams } from "@/lib/validation/parse-route-params";
import { apiError } from "@/lib/api/errors";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(
  request: Request,
  { params }: RouteParams
) {
  const result = await getAuthenticatedUser();
  if (result.error) return result.error;
  const { user } = result;

  const parsed = await parseRouteParams(params);
  if (parsed.error) return parsed.error;

  const jobs = await getProcessingJobsCollection();
  const job = await jobs.findOne({ _id: parsed.id });

  if (!job) {
    return apiError("Job not found", 404);
  }

  if (job.userId.toString() !== user._id!.toString()) {
    return apiError("Unauthorized", 403);
  }

  if (job.status === "running") {
    return apiError("Cannot cancel a running job", 400);
  }

  await jobs.deleteOne({ _id: parsed.id });

  return NextResponse.json({ success: true });
}
