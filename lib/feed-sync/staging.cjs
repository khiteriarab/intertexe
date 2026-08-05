/**
 * Stage-only helpers for Rakuten ingest (CJS; used by rakuten-sync.js).
 */

async function openOrResumeStagingSession(supabase, meta = {}) {
  const forceNew =
    Boolean(meta?.forceNew) ||
    String(process.env.FEED_STAGE_FORCE_NEW_SESSION || "").trim() === "1";

  if (!forceNew) {
    const { data: open } = await supabase
      .from("feed_staging_sessions")
      .select("session_id, status, row_count")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (open?.session_id) return open;
  } else {
    // Close any lingering open sessions so this dry run is isolated.
    const { data: openRows } = await supabase
      .from("feed_staging_sessions")
      .select("session_id")
      .eq("status", "open");
    for (const row of openRows || []) {
      await supabase
        .from("feed_staging_sessions")
        .update({
          status: "aborted",
          abort_reason: "force_new_staging_session",
          updated_at: new Date().toISOString(),
          meta: {
            abandonedReason: "force_new_staging_session",
            abandonedAt: new Date().toISOString(),
          },
        })
        .eq("session_id", row.session_id);
    }
  }

  const { data, error } = await supabase
    .from("feed_staging_sessions")
    .insert({
      status: "open",
      source: "rakuten",
      meta,
    })
    .select("session_id, status, row_count")
    .single();
  if (error) throw error;
  return data;
}

async function stageProductBatch(supabase, sessionId, products) {
  if (!products?.length) return 0;
  const rows = products.map((p) => ({
    session_id: sessionId,
    product_id: String(p.product_id),
    payload: p,
    merchant_id: p.merchant_id != null ? String(p.merchant_id) : null,
    brand_slug: p.brand_slug != null ? String(p.brand_slug) : null,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await supabase
    .from("feed_staged_rows")
    .upsert(rows, { onConflict: "session_id,product_id" });
  if (error) throw error;
  return rows.length;
}

async function bumpStagingSession(supabase, sessionId, patch) {
  const { error } = await supabase
    .from("feed_staging_sessions")
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq("session_id", sessionId);
  if (error) throw error;
}

async function markStagingComplete(supabase, sessionId, meta = {}) {
  const { count } = await supabase
    .from("feed_staged_rows")
    .select("product_id", { count: "exact", head: true })
    .eq("session_id", sessionId);
  await bumpStagingSession(supabase, sessionId, {
    status: "complete",
    cycle_complete: true,
    row_count: Number(count || 0),
    completed_at: new Date().toISOString(),
    meta,
  });
  return Number(count || 0);
}

module.exports = {
  openOrResumeStagingSession,
  stageProductBatch,
  bumpStagingSession,
  markStagingComplete,
};
