/**
 * Run: node --import tsx --test scripts/supabase-fetch.test.ts
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createSupabaseTimedFetch } from "../lib/supabase-fetch.ts";

test("timed fetch aborts before long hangs", async () => {
  const prev = process.env.SUPABASE_FETCH_TIMEOUT_MS;
  process.env.SUPABASE_FETCH_TIMEOUT_MS = "80";
  const fetchFn = createSupabaseTimedFetch(80);
  const started = Date.now();
  await assert.rejects(
    () =>
      fetchFn("https://httpbin.org/delay/10", {
        // unreachable delay — abort must win well under 1s
      }),
    (err: unknown) => {
      const name = err instanceof Error ? err.name : "";
      return name === "AbortError" || name === "TimeoutError" || /abort/i.test(String(err));
    }
  );
  const elapsed = Date.now() - started;
  assert.ok(elapsed < 1500, `expected fast abort, got ${elapsed}ms`);
  if (prev === undefined) delete process.env.SUPABASE_FETCH_TIMEOUT_MS;
  else process.env.SUPABASE_FETCH_TIMEOUT_MS = prev;
});
