import { NextResponse } from "next/server";
import { getProcessingJobsCollection } from "@/lib/db/collections";
import { ObjectId } from "mongodb";
import { getAuthenticatedUser } from "@/lib/auth/get-authenticated-user";
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

  const { id } = await params;
  const jobs = await getProcessingJobsCollection();
  const job = await jobs.findOne({ _id: new ObjectId(id) });

  if (!job) {
    return apiError("Job not found", 404);
  }

  if (job.userId.toString() !== user._id!.toString()) {
    return apiError("Unauthorized", 403);
  }

  if (job.status === "running") {
    return apiError("Cannot cancel a running job", 400);
  }

  await jobs.deleteOne({ _id: new ObjectId(id) });

  return NextResponse.json({ success: true });
}
