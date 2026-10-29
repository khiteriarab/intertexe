import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const root = join(import.meta.dirname, "..");

test("middleware defaults /api to private no-store; opt-in public cache only", () => {
  const src = readFileSync(join(root, "middleware.ts"), "utf8");
  assert.match(src, /PUBLIC_API_CACHE_PREFIXES/);
  assert.match(src, /PRIVATE_API_NO_CACHE_HEADERS/);
  assert.match(src, /allowPublicCache/);
  // Must not blanket-cache auth-bearing Inspirations / favorites APIs.
  assert.doesNotMatch(
    src,
    /NO_CACHE_PREFIXES\s*=\s*\[\s*"\/api\/auth\/"/
  );
  assert.match(src, /\/api\/products/);
  assert.match(src, /\/api\/catalog/);
  assert.match(src, /no-store/);
});

test("GET /api/capture stays dynamic with private cache headers", () => {
  const src = readFileSync(join(root, "app/api/capture/route.ts"), "utf8");
  assert.match(src, /export const dynamic = "force-dynamic"/);
  assert.match(src, /export const maxDuration = 10/);
  assert.match(src, /createSupabaseTimedFetch/);
  assert.match(src, /private, no-store/);
  assert.match(src, /alternatives: \[\]/);
});
