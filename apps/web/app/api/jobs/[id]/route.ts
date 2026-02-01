import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getUsersCollection, getProcessingJobsCollection } from "@/lib/db/collections";
import { ObjectId } from "mongodb";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await getUsersCollection();
  const user = await users.findOne({ clerkId: userId });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const jobs = await getProcessingJobsCollection();
  const job = await jobs.findOne({ _id: new ObjectId(params.id) });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (job.userId.toString() !== user._id!.toString()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  if (job.status === "running") {
    return NextResponse.json(
      { error: "Cannot cancel a running job" },
      { status: 400 }
    );
  }

  await jobs.deleteOne({ _id: new ObjectId(params.id) });

  return NextResponse.json({ success: true });
}
