import { NextResponse } from "next/server";
import { ZodSchema } from "zod";

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
    return {
      error: NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      ),
    };
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    return {
      error: NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      ),
    };
  }

  return { data: result.data };
}
