import { NextResponse } from "next/server";
import { serialize } from "@/lib/data/serialize";

export function apiError(
  error: string,
  status: number,
  details?: string
): NextResponse {
  const body: { error: string; details?: string } = { error };
  if (details) body.details = details;
  return NextResponse.json(body, { status });
}

export function apiResponse<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(serialize(data), init);
}
