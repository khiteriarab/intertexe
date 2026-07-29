/**
 * P0 feed protection fixtures (no live network required).
 * Run: node --import tsx --test scripts/feed-protection.test.ts
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const {
  assertIngestAllowed,
  liveIngestEnvEnabled,
  stageOnlyEnvEnabled,
} = require("../lib/feed-sync/ingest-guard.cjs");

function fakeSupabase(flags: Record<string, Record<string, unknown>>) {
  return {
    from(key: string) {
      if (key !== "system_status") {
        throw new Error(`unexpected table ${key}`);
      }
      return {
        select() {
          return {
            eq(_col: string, statusKey: string) {
              return {
                async maybeSingle() {
                  return { data: { value_json: flags[statusKey] || {} }, error: null };
                },
              };
            },
          };
        },
      };
    },
  };
}

test("live ingest env defaults off", () => {
  const prev = process.env.FEED_LIVE_INGEST_ENABLED;
  delete process.env.FEED_LIVE_INGEST_ENABLED;
  assert.equal(liveIngestEnvEnabled(), false);
  if (prev === undefined) delete process.env.FEED_LIVE_INGEST_ENABLED;
  else process.env.FEED_LIVE_INGEST_ENABLED = prev;
});

test("stage-only defaults on when live ingest off", () => {
  const prevLive = process.env.FEED_LIVE_INGEST_ENABLED;
  const prevStage = process.env.FEED_STAGE_ONLY;
  delete process.env.FEED_LIVE_INGEST_ENABLED;
  delete process.env.FEED_STAGE_ONLY;
  assert.equal(stageOnlyEnvEnabled(), true);
  process.env.FEED_LIVE_INGEST_ENABLED = prevLive;
  process.env.FEED_STAGE_ONLY = prevStage;
});

test("publish kill switch blocks ingest", async () => {
  const sb = fakeSupabase({
    catalog_publish_blocked: { blocked: true, reason: "test" },
    feed_ingest_blocked: { blocked: false },
  });
  const result = await assertIngestAllowed(sb as any);
  assert.equal(result.ok, false);
  assert.match(result.reason, /catalog_publish_blocked|kill_switches_armed/);
});

test("ingest kill switch blocks ingest", async () => {
  const sb = fakeSupabase({
    catalog_publish_blocked: { blocked: false },
    feed_ingest_blocked: { blocked: true, reason: "p0" },
  });
  const result = await assertIngestAllowed(sb as any);
  assert.equal(result.ok, false);
  assert.match(result.reason, /feed_ingest_blocked|kill_switches_armed/);
});

test("clear switches + no live flag => stage mode", async () => {
  const prevLive = process.env.FEED_LIVE_INGEST_ENABLED;
  const prevStage = process.env.FEED_STAGE_ONLY;
  const prevDry = process.env.FEED_STAGE_DRY_RUN;
  delete process.env.FEED_LIVE_INGEST_ENABLED;
  delete process.env.FEED_STAGE_ONLY;
  delete process.env.FEED_STAGE_DRY_RUN;
  const sb = fakeSupabase({
    catalog_publish_blocked: { blocked: false },
    feed_ingest_blocked: { blocked: false },
  });
  const result = await assertIngestAllowed(sb as any);
  assert.equal(result.ok, true);
  assert.equal(result.mode, "stage");
  process.env.FEED_LIVE_INGEST_ENABLED = prevLive;
  process.env.FEED_STAGE_ONLY = prevStage;
  process.env.FEED_STAGE_DRY_RUN = prevDry;
});

test("armed switches block stage unless FEED_STAGE_DRY_RUN=1", async () => {
  const prevLive = process.env.FEED_LIVE_INGEST_ENABLED;
  const prevStage = process.env.FEED_STAGE_ONLY;
  const prevDry = process.env.FEED_STAGE_DRY_RUN;
  delete process.env.FEED_LIVE_INGEST_ENABLED;
  process.env.FEED_STAGE_ONLY = "1";
  delete process.env.FEED_STAGE_DRY_RUN;
  const sb = fakeSupabase({
    catalog_publish_blocked: { blocked: true },
    feed_ingest_blocked: { blocked: true },
  });
  const blocked = await assertIngestAllowed(sb as any);
  assert.equal(blocked.ok, false);
  process.env.FEED_STAGE_DRY_RUN = "1";
  const dry = await assertIngestAllowed(sb as any);
  assert.equal(dry.ok, true);
  assert.equal(dry.mode, "stage");
  process.env.FEED_LIVE_INGEST_ENABLED = prevLive;
  process.env.FEED_STAGE_ONLY = prevStage;
  process.env.FEED_STAGE_DRY_RUN = prevDry;
});

test("armed switches still block live even with dry-run flag", async () => {
  const prevLive = process.env.FEED_LIVE_INGEST_ENABLED;
  const prevDry = process.env.FEED_STAGE_DRY_RUN;
  process.env.FEED_LIVE_INGEST_ENABLED = "1";
  process.env.FEED_STAGE_DRY_RUN = "1";
  const sb = fakeSupabase({
    catalog_publish_blocked: { blocked: true },
    feed_ingest_blocked: { blocked: true },
  });
  const result = await assertIngestAllowed(sb as any);
  assert.equal(result.ok, false);
  assert.match(result.reason, /catalog_publish_blocked|feed_ingest_blocked/);
  process.env.FEED_LIVE_INGEST_ENABLED = prevLive;
  process.env.FEED_STAGE_DRY_RUN = prevDry;
});

test("clear switches + live flag => live mode", async () => {
  const prevLive = process.env.FEED_LIVE_INGEST_ENABLED;
  process.env.FEED_LIVE_INGEST_ENABLED = "1";
  const sb = fakeSupabase({
    catalog_publish_blocked: { blocked: false },
    feed_ingest_blocked: { blocked: false },
  });
  const result = await assertIngestAllowed(sb as any);
  assert.equal(result.ok, true);
  assert.equal(result.mode, "live");
  process.env.FEED_LIVE_INGEST_ENABLED = prevLive;
});

test("empty/partial promote rules encoded in promote module source", async () => {
  const fs = await import("fs");
  const src = fs.readFileSync(
    new URL("../lib/feed-sync/promote-staging.ts", import.meta.url),
    "utf8"
  );
  assert.match(src, /empty_session/);
  assert.match(src, /partial_files_processed/);
  assert.match(src, /cycle_incomplete/);
  assert.match(src, /missing_catalog_files/);
  assert.match(src, /CATALOG_SMOKE_AUTOROLLBACK/);
});

test("nightly schedule is commented out in workflow", async () => {
  const fs = await import("fs");
  const src = fs.readFileSync(
    new URL("../.github/workflows/rakuten-feed-sync.yml", import.meta.url),
    "utf8"
  );
  assert.match(src, /# schedule:/);
  assert.match(src, /#\s+- cron: "0 2 \* \* \*"/);
  assert.doesNotMatch(src, /\n\s+schedule:\s*\n\s+- cron:/);
});
