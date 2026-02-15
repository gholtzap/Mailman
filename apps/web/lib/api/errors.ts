import { NextResponse } from "next/server";

export function apiError(
  error: string,
  status: number,
  details?: string
): NextResponse {
  const body: { error: string; details?: string } = { error };
  if (details) body.details = details;
  return NextResponse.json(body, { status });
}
