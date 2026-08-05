/**
 * Promote a completed staging session into live products — additive only.
 *
 * - Inserts validated new products
 * - Updates safe feed fields on existing products (price/stock/image/composition/links)
 * - Preserves curated fields
 * - Never deactivates or deletes existing products
 * - Never promotes when kill switches are armed or session is incomplete
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { createRequire } from "module";
import { takeCatalogSnapshot, restoreCatalogFromSnapshot } from "../catalog-snapshot";
import { evaluatePromoteGates, runCatalogSmokeTests } from "../catalog-health";

const require = createRequire(import.meta.url);
const { assertIngestAllowed } = require("./ingest-guard.cjs");

/** Never overwrite these on existing live rows. */
const CURATED_FIELDS = new Set([
  "tags",
  "collection_slugs",
  "editorial_categories",
  "matching_set_id",
  "added_at",
  "approved",
  "is_active",
  "is_displayable",
  "is_editor_pick",
  "editor_picked_at",
]);

/**
 * Safe additive updates for existing products only.
 * Explicitly excludes is_active / is_displayable / approved / editorial fields.
 */
const ADDITIVE_UPDATE_FIELDS = new Set([
  "price",
  "original_price",
  "raw_price",
  "currency",
  "is_sale",
  "discount_percent",
  "image_url",
  "composition",
  "natural_fiber_percent",
  "material_summary",
  "stock_status",
  "url",
  "last_seen_at",
  "last_price_check",
  "price_changed_at",
  "color",
  "size_options",
  "country_of_origin",
  "care_instructions",
  "season",
  "retailer",
  "retailer_name",
  "retailer_country",
  "region",
  "brand_name",
  "brand_slug",
  "name",
  "category",
]);

const PAGE = 500;

export type PromoteResult = {
  ok: boolean;
  reason?: string;
  sessionId?: string;
  rowsPromoted?: number;
  inserted?: number;
  updated?: number;
  skippedUnsafe?: number;
  snapshotId?: string;
  smokeOk?: boolean;
  rolledBack?: boolean;
  mode?: "additive";
};

function additiveUpdatePayload(p: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { product_id: p.product_id };
  for (const [k, v] of Object.entries(p)) {
    if (CURATED_FIELDS.has(k)) continue;
    if (!ADDITIVE_UPDATE_FIELDS.has(k)) continue;
    if (v === undefined) continue;
    out[k] = v;
  }
  return out;
}

export async function promoteStagingSession(
  supabase: SupabaseClient,
  sessionId: string,
  options?: { skipSmoke?: boolean; additiveOnly?: boolean }
): Promise<PromoteResult> {
  const additiveOnly = options?.additiveOnly !== false; // default ON
  const gate = await assertIngestAllowed(supabase, { forceLive: true });
  if (!gate.ok && gate.mode === "blocked") {
    return { ok: false, reason: gate.reason, sessionId, mode: "additive" };
  }
  const { data: publish } = await supabase
    .from("system_status")
    .select("value_json")
    .eq("key", "catalog_publish_blocked")
    .maybeSingle();
  if ((publish?.value_json as { blocked?: boolean } | undefined)?.blocked === true) {
    return { ok: false, reason: "catalog_publish_blocked", sessionId, mode: "additive" };
  }

  const { data: session, error: sessionErr } = await supabase
    .from("feed_staging_sessions")
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (sessionErr) throw sessionErr;
  if (!session) return { ok: false, reason: "session_not_found", sessionId, mode: "additive" };
  if (session.status !== "complete" && session.status !== "validated") {
    return { ok: false, reason: `session_status_${session.status}`, sessionId, mode: "additive" };
  }
  if (!session.cycle_complete) {
    return { ok: false, reason: "cycle_incomplete", sessionId, mode: "additive" };
  }
  if (Number(session.row_count || 0) <= 0) {
    return { ok: false, reason: "empty_session", sessionId, mode: "additive" };
  }
  if (Number(session.total_catalog_files || 0) <= 0) {
    return { ok: false, reason: "missing_catalog_files", sessionId, mode: "additive" };
  }
  if (Number(session.files_processed || 0) < Number(session.total_catalog_files || 0)) {
    return { ok: false, reason: "partial_files_processed", sessionId, mode: "additive" };
  }

  const snapshot = await takeCatalogSnapshot(supabase, {
    source: "pre_promote_additive",
    note: `additive pre-promote session ${sessionId}`,
  });

  const { data: promo, error: promoErr } = await supabase
    .from("feed_promotion_history")
    .insert({
      session_id: sessionId,
      snapshot_id: snapshot.snapshotId,
      meta: { phase: "started", mode: "additive", deactivate: false },
    })
    .select("promotion_id")
    .single();
  if (promoErr) throw promoErr;

  let inserted = 0;
  let updated = 0;
  let skippedUnsafe = 0;
  let offset = 0;
  for (;;) {
    const { data: page, error } = await supabase
      .from("feed_staged_rows")
      .select("product_id, payload")
      .eq("session_id", sessionId)
      .order("product_id", { ascending: true })
      .range(offset, offset + PAGE - 1);
    if (error) throw error;
    const rows = page || [];
    if (!rows.length) break;

    const payloads = rows.map((r) => r.payload as Record<string, unknown>);
    const productIds = payloads.map((p) => String(p.product_id));
    const { data: existing } = await supabase
      .from("products")
      .select("product_id")
      .in("product_id", productIds);
    const existingIds = new Set((existing || []).map((r) => r.product_id));

    const inserts = payloads.filter((p) => !existingIds.has(String(p.product_id)));
    const updates = payloads
      .filter((p) => existingIds.has(String(p.product_id)))
      .map((p) => (additiveOnly ? additiveUpdatePayload(p) : Object.fromEntries(
        Object.entries(p).filter(([k]) => !CURATED_FIELDS.has(k))
      )))
      .filter((p) => Object.keys(p).length > 1);

    skippedUnsafe += payloads.filter((p) => existingIds.has(String(p.product_id))).length - updates.length;

    if (inserts.length) {
      const { error: insErr } = await supabase.from("products").insert(inserts);
      if (insErr) throw insErr;
      inserted += inserts.length;
    }
    if (updates.length) {
      const { error: upErr } = await supabase
        .from("products")
        .upsert(updates, { onConflict: "product_id", ignoreDuplicates: false });
      if (upErr) throw upErr;
      updated += updates.length;
    }

    offset += rows.length;
    if (rows.length < PAGE) break;
  }

  const rowsPromoted = inserted + updated;
  const verification = await evaluatePromoteGates(supabase);
  let smoke = { ok: true as boolean, checks: [] as unknown[] };
  if (!options?.skipSmoke) {
    smoke = await runCatalogSmokeTests();
  }

  let rolledBack = false;
  const shouldRollback = !verification.ready || !smoke.ok;

  if (shouldRollback && process.env.CATALOG_SMOKE_AUTOROLLBACK === "1") {
    await restoreCatalogFromSnapshot(supabase, snapshot.snapshotId);
    rolledBack = true;
  }

  await supabase
    .from("feed_staging_sessions")
    .update({
      status: rolledBack ? "failed" : "promoted",
      promoted_at: rolledBack ? null : new Date().toISOString(),
      abort_reason: rolledBack ? "smoke_or_gates_failed" : null,
      updated_at: new Date().toISOString(),
      meta: {
        ...(typeof session.meta === "object" && session.meta ? session.meta : {}),
        promoteMode: "additive",
        inserted,
        updated,
        deactivated: 0,
      },
    })
    .eq("session_id", sessionId);

  await supabase
    .from("feed_promotion_history")
    .update({
      finished_at: new Date().toISOString(),
      ok: !rolledBack && verification.ready && smoke.ok,
      rows_promoted: rowsPromoted,
      smoke_ok: smoke.ok,
      rolled_back: rolledBack,
      meta: {
        verification,
        smoke,
        mode: "additive",
        inserted,
        updated,
        deactivated: 0,
        skippedUnsafe,
      },
    })
    .eq("promotion_id", promo.promotion_id);

  if (rolledBack || !verification.ready || !smoke.ok) {
    return {
      ok: false,
      reason: rolledBack ? "rolled_back_after_smoke_or_gates" : "gates_or_smoke_failed",
      sessionId,
      rowsPromoted,
      inserted,
      updated,
      skippedUnsafe,
      snapshotId: snapshot.snapshotId,
      smokeOk: smoke.ok,
      rolledBack,
      mode: "additive",
    };
  }

  return {
    ok: true,
    sessionId,
    rowsPromoted,
    inserted,
    updated,
    skippedUnsafe,
    snapshotId: snapshot.snapshotId,
    smokeOk: smoke.ok,
    rolledBack: false,
    mode: "additive",
  };
}
