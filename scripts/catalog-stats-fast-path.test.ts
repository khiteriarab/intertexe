import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const root = join(import.meta.dirname, "..");

test("catalog/stats never awaits refreshCatalogRouteStats on the request path", () => {
  const src = readFileSync(join(root, "app/api/catalog/stats/route.ts"), "utf8");
  assert.match(src, /after\s*\(/);
  assert.match(src, /allowStale:\s*true/);
  // Background only — must not block the response on a full recompute.
  assert.doesNotMatch(src, /await\s+refreshCatalogRouteStats/);
  assert.match(src, /void refreshCatalogRouteStats/);
});

test("catalog route stats default to serving stale cache while cron is paused", () => {
  const src = readFileSync(join(root, "lib/catalog-route-stats.ts"), "utf8");
  assert.match(src, /allowStale\s*=\s*options\.allowStale\s*!==\s*false/);
  assert.match(src, /CATALOG_ROUTE_STATS_FRESH_MS/);
});

test("cached catalog stats prefer platform_stats_cache before live exact count", () => {
  const src = readFileSync(join(root, "lib/cached-catalog-stats.ts"), "utf8");
  const fn = src.slice(src.indexOf("export async function getCachedCatalogStats"));
  const cacheIdx = fn.indexOf("await readPlatformStatsCache()");
  const liveIdx = fn.indexOf("await readLiveApparelCount(");
  assert.ok(cacheIdx >= 0 && liveIdx >= 0, "both helpers must remain in getCachedCatalogStats");
  assert.ok(
    cacheIdx < liveIdx,
    "platform_stats_cache must run before live_products_apparel exact count"
  );
});
