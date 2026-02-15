import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/errors";

type ParseResult =
  | { id: ObjectId; error?: never }
  | { id?: never; error: NextResponse };

export async function parseRouteParams(
  params: Promise<{ id: string }>
): Promise<ParseResult> {
  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return { error: apiError("Invalid ID", 400) };
  }
  return { id: new ObjectId(id) };
}
