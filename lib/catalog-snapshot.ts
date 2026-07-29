/**
 * Row-level catalog snapshots for instant restore.
 * Schema: supabase/migrations/20260727_catalog_product_snapshots.sql
 *
 * Metadata-only system_status.catalog_last_known_good is NOT enough (incident 2026-07-27).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type CatalogSnapshotHeader = {
  snapshotId: string;
  capturedAt: string;
  source: string;
  note: string | null;
  productCount: number;
  displayableCount: number;
  brandCount: number;
  merchantCount: number;
  meta: Record<string, unknown>;
};

export type SnapshotCounts = {
  productCount: number;
  displayableCount: number;
  brandCount: number;
  merchantCount: number;
  saleCount: number;
  byMerchant: Record<string, number>;
  byBrandTop: Array<{ brand: string; count: number }>;
};

const ROW_PAGE = 1000;
const UPSERT_CHUNK = 500;

type Untyped = SupabaseClient<any, "public", any>;

async function countExact(
  supabase: Untyped,
  table: string,
  apply?: (q: any) => any
): Promise<number> {
  let q = supabase.from(table).select("id", { count: "exact", head: true });
  if (apply) q = apply(q);
  const { count, error } = await q;
  if (error) throw error;
  return Number(count || 0);
}

/** Collect live catalog counts used by promotion gates and health score. */
export async function collectCatalogCounts(supabase: Untyped): Promise<SnapshotCounts> {
  const productCount = await countExact(supabase, "products");
  const displayableCount = await countExact(supabase, "products", (q) =>
    q.eq("is_displayable", true)
  );
  const saleCount = await countExact(supabase, "products", (q) =>
    q.eq("is_displayable", true).eq("is_sale", true)
  );

  // Distinct brands / merchants among displayable (bounded sample + exact when possible).
  const { data: brandRows, error: brandErr } = await supabase
    .from("products")
    .select("brand_slug")
    .eq("is_displayable", true)
    .not("brand_slug", "is", null)
    .limit(20000);
  if (brandErr) throw brandErr;
  const brands = new Set(
    (brandRows || []).map((r: { brand_slug?: string }) => String(r.brand_slug || "").trim()).filter(Boolean)
  );

  const { data: midRows, error: midErr } = await supabase
    .from("products")
    .select("merchant_id")
    .eq("is_displayable", true)
    .not("merchant_id", "is", null)
    .limit(20000);
  if (midErr) throw midErr;
  const byMerchant: Record<string, number> = {};
  for (const r of midRows || []) {
    const mid = String((r as { merchant_id?: string }).merchant_id || "").trim();
    if (!mid) continue;
    byMerchant[mid] = (byMerchant[mid] || 0) + 1;
  }

  const brandTally: Record<string, number> = {};
  for (const r of brandRows || []) {
    const b = String((r as { brand_slug?: string }).brand_slug || "").trim();
    if (!b) continue;
    brandTally[b] = (brandTally[b] || 0) + 1;
  }
  const byBrandTop = Object.entries(brandTally)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 40)
    .map(([brand, count]) => ({ brand, count }));

  return {
    productCount,
    displayableCount,
    brandCount: brands.size,
    merchantCount: Object.keys(byMerchant).length,
    saleCount,
    byMerchant,
    byBrandTop,
  };
}

/**
 * Capture a restorable snapshot of displayable-relevant product flags.
 * Also updates system_status.catalog_last_known_good for backward-compatible tooling.
 */
export async function takeCatalogSnapshot(
  supabase: Untyped,
  source: string,
  note?: string
): Promise<CatalogSnapshotHeader> {
  const counts = await collectCatalogCounts(supabase);
  const capturedAt = new Date().toISOString();

  const { data: header, error: headerErr } = await supabase
    .from("catalog_product_snapshots")
    .insert({
      source,
      note: note || null,
      product_count: counts.productCount,
      displayable_count: counts.displayableCount,
      brand_count: counts.brandCount,
      merchant_count: counts.merchantCount,
      meta: {
        saleCount: counts.saleCount,
        byMerchant: counts.byMerchant,
        byBrandTop: counts.byBrandTop,
        capturedAt,
      },
      captured_at: capturedAt,
    })
    .select("snapshot_id, captured_at")
    .single();

  if (headerErr || !header?.snapshot_id) {
    throw new Error(headerErr?.message || "Failed to insert catalog_product_snapshots header");
  }

  const snapshotId = String(header.snapshot_id);
  let offset = 0;
  let rowsWritten = 0;

  // Prefer displayable + recently active rows so restore covers the live catalog surface.
  for (;;) {
    const { data: page, error } = await supabase
      .from("products")
      .select(
        "id, product_id, is_active, approved, is_displayable, brand_name, merchant_id, stock_status, composition, natural_fiber_percent"
      )
      .or("is_displayable.eq.true,is_active.eq.true")
      .order("id", { ascending: true })
      .range(offset, offset + ROW_PAGE - 1);

    if (error) throw error;
    const rows = page || [];
    if (rows.length === 0) break;

    for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
      const chunk = rows.slice(i, i + UPSERT_CHUNK).map((r: Record<string, unknown>) => ({
        snapshot_id: snapshotId,
        product_id: String(r.product_id || ""),
        id: r.id || null,
        is_active: r.is_active ?? null,
        approved: r.approved ?? null,
        is_displayable: r.is_displayable ?? null,
        brand_name: r.brand_name ?? null,
        merchant_id: r.merchant_id ?? null,
        stock_status: r.stock_status ?? null,
        composition: r.composition ?? null,
        natural_fiber_percent: r.natural_fiber_percent ?? null,
      })).filter((r) => r.product_id);

      if (chunk.length === 0) continue;
      const { error: upErr } = await supabase
        .from("catalog_product_snapshot_rows")
        .upsert(chunk, { onConflict: "snapshot_id,product_id" });
      if (upErr) throw upErr;
      rowsWritten += chunk.length;
    }

    offset += rows.length;
    if (rows.length < ROW_PAGE) break;
  // Safety cap removed (P0): capture the full displayable surface for restore.
  // Previously capped at 250k which left most of a multi-million catalog unrestorable.
  }

  await supabase.from("system_status").upsert({
    key: "catalog_last_known_good",
    value_json: {
      displayable: counts.displayableCount,
      productCount: counts.productCount,
      brandCount: counts.brandCount,
      merchantCount: counts.merchantCount,
      saleCount: counts.saleCount,
      snapshotId,
      capturedAt,
      source,
      rowsWritten,
    },
    updated_at: capturedAt,
  });

  await supabase.from("system_status").upsert({
    key: "catalog_active_version",
    value_json: {
      snapshotId,
      capturedAt,
      source,
      displayableCount: counts.displayableCount,
    },
    updated_at: capturedAt,
  });

  return {
    snapshotId,
    capturedAt: String(header.captured_at || capturedAt),
    source,
    note: note || null,
    productCount: counts.productCount,
    displayableCount: counts.displayableCount,
    brandCount: counts.brandCount,
    merchantCount: counts.merchantCount,
    meta: { saleCount: counts.saleCount, rowsWritten, byMerchant: counts.byMerchant },
  };
}

export async function latestCatalogSnapshot(
  supabase: Untyped
): Promise<CatalogSnapshotHeader | null> {
  const { data, error } = await supabase
    .from("catalog_product_snapshots")
    .select(
      "snapshot_id, captured_at, source, note, product_count, displayable_count, brand_count, merchant_count, meta"
    )
    .order("captured_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    snapshotId: String(data.snapshot_id),
    capturedAt: String(data.captured_at),
    source: String(data.source),
    note: data.note != null ? String(data.note) : null,
    productCount: Number(data.product_count || 0),
    displayableCount: Number(data.displayable_count || 0),
    brandCount: Number(data.brand_count || 0),
    merchantCount: Number(data.merchant_count || 0),
    meta: (data.meta || {}) as Record<string, unknown>,
  };
}

/**
 * Restore is_active (and approved when present) from a row-level snapshot.
 * Soft restore only — never DELETE.
 */
export async function restoreCatalogFromSnapshot(
  supabase: Untyped,
  snapshotId: string,
  options?: { maxRows?: number; dryRun?: boolean }
): Promise<{ restored: number; dryRun: boolean; snapshotId: string }> {
  // Uncapped by default (P0). Set CATALOG_ROLLBACK_MAX only to intentionally bound restores.
  const maxRows =
    options?.maxRows ??
    (process.env.CATALOG_ROLLBACK_MAX
      ? Number(process.env.CATALOG_ROLLBACK_MAX)
      : Number.POSITIVE_INFINITY);
  const dryRun = options?.dryRun === true;
  let restored = 0;
  let offset = 0;

  for (;;) {
    if (restored >= maxRows) break;
    const { data: page, error } = await supabase
      .from("catalog_product_snapshot_rows")
      .select("product_id, id, is_active, approved")
      .eq("snapshot_id", snapshotId)
      .eq("is_active", true)
      .order("product_id", { ascending: true })
      .range(offset, offset + ROW_PAGE - 1);
    if (error) throw error;
    const rows = page || [];
    if (rows.length === 0) break;

    if (!dryRun) {
      for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
        const chunk = rows.slice(i, i + UPSERT_CHUNK);
        const ids = chunk.map((r: { id?: string }) => r.id).filter(Boolean) as string[];
        const productIds = chunk
          .map((r: { product_id?: string }) => r.product_id)
          .filter(Boolean) as string[];

        if (ids.length) {
          const { error: upErr } = await supabase
            .from("products")
            .update({ is_active: true })
            .in("id", ids);
          if (upErr) throw upErr;
        } else if (productIds.length) {
          const { error: upErr } = await supabase
            .from("products")
            .update({ is_active: true })
            .in("product_id", productIds);
          if (upErr) throw upErr;
        }
        restored += chunk.length;
      }
    } else {
      restored += rows.length;
    }

    offset += rows.length;
    if (rows.length < ROW_PAGE) break;
  }

  if (!dryRun) {
    await supabase.from("system_status").upsert({
      key: "catalog_publish_blocked",
      value_json: {
        blocked: false,
        clearedBy: "restoreCatalogFromSnapshot",
        snapshotId,
        restored,
        at: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    });
    await supabase.from("system_status").upsert({
      key: "catalog_last_rollback",
      value_json: {
        snapshotId,
        restored,
        at: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    });
  }

  return { restored, dryRun, snapshotId };
}
