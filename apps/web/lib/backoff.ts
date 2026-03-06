export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitterFraction?: number;
}

function computeBackoff(
  attempt: number,
  retryAfterHeader: string | null,
  { baseDelayMs = 3500, maxDelayMs = 30000, jitterFraction = 0.25 }: RetryOptions
): number {
  let base: number;

  if (retryAfterHeader) {
    const parsed = parseInt(retryAfterHeader, 10);
    base = Number.isFinite(parsed) && parsed > 0 ? parsed * 1000 : baseDelayMs * (attempt + 1);
  } else {
    base = baseDelayMs * (attempt + 1);
  }

  const jitter = base * jitterFraction * (Math.random() * 2 - 1);
  return Math.min(Math.max(0, base + jitter), maxDelayMs);
}

export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  opts: RetryOptions = {}
): Promise<Response> {
  const { maxRetries = 3 } = opts;

  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(url, init);

    if (response.status !== 429) {
      return response;
    }

    lastResponse = response;

    if (attempt < maxRetries - 1) {
      const retryAfter = response.headers.get("Retry-After");
      const backoffMs = computeBackoff(attempt, retryAfter, opts);
      await delay(backoffMs);
    }
  }

  return lastResponse!;
}
