import { Webhook } from "svix";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getUsersCollection } from "@/lib/db/collections";
import { createLogger } from "@/lib/logging";
import { apiError } from "@/lib/api/errors";

export async function POST(req: Request) {
  const log = createLogger({ route: "clerk-webhook" });

  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    log.error("CLERK_WEBHOOK_SECRET not configured");
    throw new Error("Please add CLERK_WEBHOOK_SECRET to .env.local");
  }

  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    log.warn("Missing Svix headers");
    return apiError("Missing headers", 400);
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: any;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as any;
  } catch (err) {
    log.error({ err }, "Webhook signature verification failed");
    return apiError("Invalid signature", 400);
  }

  const eventType = evt.type;
  log.info({ eventType }, "Processing Clerk webhook event");

  if (eventType === "user.created") {
    const { id, email_addresses } = evt.data;
    const email = email_addresses[0]?.email_address;

    const users = await getUsersCollection();
    await users.insertOne({
      clerkId: id,
      email,
      settings: {
        defaultCategories: ["cs.AI", "cs.LG"],
        maxPagesPerPaper: 50,
        papersPerCategory: 5,
      },
      usage: {
        currentMonthPapersProcessed: 0,
        lastResetDate: new Date(),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    log.info({ clerkId: id, email }, "User created successfully");
  }

  return NextResponse.json({ success: true });
}
