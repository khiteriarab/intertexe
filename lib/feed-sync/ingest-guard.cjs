/**
 * P0 catalog protection: refuse live `products` mutation unless explicitly armed.
 *
 * Live writes require ALL of:
 *   - FEED_LIVE_INGEST_ENABLED=1
 *   - system_status.catalog_publish_blocked.blocked !== true
 *   - system_status.feed_ingest_blocked.blocked !== true
 *
 * Default mode is stage-only (FEED_STAGE_ONLY=1 implicit when live ingest is off).
 */

async function readStatusFlag(supabase, key) {
  const { data, error } = await supabase
    .from("system_status")
    .select("value_json")
    .eq("key", key)
    .maybeSingle();
  if (error) throw error;
  return (data?.value_json || {});
}

function liveIngestEnvEnabled() {
  return String(process.env.FEED_LIVE_INGEST_ENABLED || "").trim() === "1";
}

function stageOnlyEnvEnabled() {
  const explicit = String(process.env.FEED_STAGE_ONLY || "").trim();
  if (explicit === "0") return false;
  if (explicit === "1") return true;
  // Default: when live ingest is off, stage-only is on.
  return !liveIngestEnvEnabled();
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {{ forceLive?: boolean }} [opts]
 */
async function assertIngestAllowed(supabase, opts = {}) {
  const publish = await readStatusFlag(supabase, "catalog_publish_blocked");
  const ingest = await readStatusFlag(supabase, "feed_ingest_blocked");

  if (publish.blocked === true) {
    return {
      ok: false,
      mode: "blocked",
      reason: `catalog_publish_blocked:${publish.reason || "blocked"}`,
    };
  }
  if (ingest.blocked === true) {
    return {
      ok: false,
      mode: "blocked",
      reason: `feed_ingest_blocked:${ingest.reason || "blocked"}`,
    };
  }

  const wantLive = opts.forceLive === true || liveIngestEnvEnabled();
  if (wantLive) {
    return { ok: true, mode: "live", reason: "FEED_LIVE_INGEST_ENABLED=1" };
  }
  if (stageOnlyEnvEnabled()) {
    return { ok: true, mode: "stage", reason: "stage_only" };
  }
  return {
    ok: false,
    mode: "blocked",
    reason: "live_ingest_disabled_set_FEED_LIVE_INGEST_ENABLED=1_or_FEED_STAGE_ONLY=1",
  };
}

/**
 * Arm/disarm the emergency kill switches.
 */
async function setCatalogKillSwitch(supabase, blocked, reason = "manual") {
  const at = new Date().toISOString();
  const payload = {
    blocked: Boolean(blocked),
    reason,
    at,
    setBy: process.env.FEED_SYNC_OWNER || "ingest-guard",
  };
  await supabase.from("system_status").upsert({
    key: "catalog_publish_blocked",
    value_json: payload,
    updated_at: at,
  });
  await supabase.from("system_status").upsert({
    key: "feed_ingest_blocked",
    value_json: payload,
    updated_at: at,
  });
  return payload;
}

module.exports = {
  assertIngestAllowed,
  setCatalogKillSwitch,
  liveIngestEnvEnabled,
  stageOnlyEnvEnabled,
  readStatusFlag,
};
