import { NextResponse } from "next/server";
import { ZodSchema } from "zod";
import { apiError } from "@/lib/api/errors";

type ParseResult<T> =
  | { data: T; error?: never }
  | { data?: never; error: NextResponse };

export async function parseRequestBody<T>(
  request: Request,
  schema: ZodSchema<T>
): Promise<ParseResult<T>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { error: apiError("Invalid request body", 400) };
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    return { error: apiError(result.error.issues[0].message, 400) };
  }

  return { data: result.data };
}
