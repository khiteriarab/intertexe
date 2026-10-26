/**
 * Timed fetch for Supabase JS clients.
 *
 * Vercel Fluid Provisioned Memory bills for wall-clock while requests are in
 * flight — including Supabase I/O wait. Without a hard timeout, an unhealthy
 * Postgres instance can hold serverless isolates open until maxDuration
 * (10–300s), which is what drove the Oct 2026 +426% memory spike.
 */
export function createSupabaseTimedFetch(defaultTimeoutMs = 5_000) {
  const timeoutMs = Math.max(
    1_000,
    Math.min(
      Number(process.env.SUPABASE_FETCH_TIMEOUT_MS || defaultTimeoutMs) || defaultTimeoutMs,
      15_000
    )
  );

  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const upstream = init?.signal;
    const onAbort = () => controller.abort();

    if (upstream) {
      if (upstream.aborted) controller.abort();
      else upstream.addEventListener("abort", onAbort, { once: true });
    }

    try {
      return await fetch(input, {
        ...init,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
      upstream?.removeEventListener("abort", onAbort);
    }
  };
}
