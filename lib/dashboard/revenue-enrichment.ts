import type { SupabaseClient } from "@supabase/supabase-js";
import type { ParsedAffiliateRow } from "./revenue";

const BLANK_U1 = new Set(["", "null", "undefined", "none", "n/a", "na"]);

/** Normalize Rakuten u1 values at import time (not just in metrics display). */
export function normalizeAffiliateU1(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  if (BLANK_U1.has(lower)) return null;
  return trimmed.slice(0, 255);
}

/** Rakuten often reports base SKU; catalog uses suffixed variants (e.g. P01167887-2). */
export function rakutenSkuBase(sku: string | null | undefined): string | null {
  if (!sku?.trim()) return null;
  const s = sku.trim();
  const dash = s.indexOf("-");
  if (dash <= 0) return s;
  const tail = s.slice(dash + 1);
  if (/^\d+$/.test(tail)) {
    return s.slice(0, dash);
  }
  return s;
}

export type CatalogSkuMatch = {
  catalogId: string;
  catalogProductId: string | null;
  catalogSku: string | null;
  brandName: string | null;
};

type MatchIndex = Map<string, CatalogSkuMatch>;

function indexKey(kind: "sku" | "product_id", value: string): string {
  return `${kind}:${value}`;
}

/** Build lookup index for a batch of affiliate rows. */
export async function buildCatalogMatchIndex(
  supabase: SupabaseClient,
  rows: ParsedAffiliateRow[]
): Promise<MatchIndex> {
  const index: MatchIndex = new Map();
  const exactSkus = new Set<string>();
  const baseSkus = new Set<string>();
  const productIds = new Set<string>();

  for (const row of rows) {
    if (row.sku?.trim()) {
      exactSkus.add(row.sku.trim());
      const base = rakutenSkuBase(row.sku);
      if (base) baseSkus.add(base);
    }
    if (row.product_id?.trim()) productIds.add(row.product_id.trim());
  }

  if (exactSkus.size) {
    const { data } = await supabase
      .from("products")
      .select("id, product_id, sku, brand_name")
      .in("sku", [...exactSkus])
      .eq("is_active", true)
      .limit(500);
    for (const p of data || []) {
      if (p.sku) {
        index.set(indexKey("sku", String(p.sku)), {
          catalogId: String(p.id),
          catalogProductId: p.product_id ? String(p.product_id) : null,
          catalogSku: p.sku ? String(p.sku) : null,
          brandName: p.brand_name ? String(p.brand_name) : null,
        });
      }
    }
  }

  for (const base of baseSkus) {
    if (index.has(indexKey("sku", base))) continue;
    const { data } = await supabase
      .from("products")
      .select("id, product_id, sku, brand_name")
      .or(`sku.eq.${base},sku.like.${base}-%`)
      .eq("is_active", true)
      .order("last_seen_at", { ascending: false })
      .limit(5);
    const hit = data?.[0];
    if (hit?.id) {
      index.set(indexKey("sku", base), {
        catalogId: String(hit.id),
        catalogProductId: hit.product_id ? String(hit.product_id) : null,
        catalogSku: hit.sku ? String(hit.sku) : null,
        brandName: hit.brand_name ? String(hit.brand_name) : null,
      });
      if (hit.sku) {
        index.set(indexKey("sku", String(hit.sku)), index.get(indexKey("sku", base))!);
      }
    }
  }

  if (productIds.size) {
    const ids = [...productIds];
    const { data: byPid } = await supabase
      .from("products")
      .select("id, product_id, sku, brand_name")
      .in("product_id", ids)
      .eq("is_active", true)
      .limit(500);
    for (const p of byPid || []) {
      if (p.product_id) {
        index.set(indexKey("product_id", String(p.product_id)), {
          catalogId: String(p.id),
          catalogProductId: String(p.product_id),
          catalogSku: p.sku ? String(p.sku) : null,
          brandName: p.brand_name ? String(p.brand_name) : null,
        });
      }
    }
    for (const pid of ids) {
      if (index.has(indexKey("product_id", pid))) continue;
      const { data: regioned } = await supabase
        .from("products")
        .select("id, product_id, sku, brand_name")
        .or(`product_id.eq.${pid},product_id.like.${pid}-%`)
        .eq("is_active", true)
        .order("last_seen_at", { ascending: false })
        .limit(3);
      const hit = regioned?.[0];
      if (hit?.product_id) {
        index.set(indexKey("product_id", pid), {
          catalogId: String(hit.id),
          catalogProductId: String(hit.product_id),
          catalogSku: hit.sku ? String(hit.sku) : null,
          brandName: hit.brand_name ? String(hit.brand_name) : null,
        });
      }
    }
  }

  return index;
}

export function matchRowToCatalog(row: ParsedAffiliateRow, index: MatchIndex): CatalogSkuMatch | null {
  if (row.sku?.trim()) {
    const exact = index.get(indexKey("sku", row.sku.trim()));
    if (exact) return exact;
    const base = rakutenSkuBase(row.sku);
    if (base) {
      const byBase = index.get(indexKey("sku", base));
      if (byBase) return byBase;
    }
  }
  if (row.product_id?.trim()) {
    const byPid = index.get(indexKey("product_id", row.product_id.trim()));
    if (byPid) return byPid;
  }
  return null;
}

export function enrichAffiliateRow(
  row: ParsedAffiliateRow,
  index: MatchIndex
): ParsedAffiliateRow & { catalog_uuid?: string | null } {
  const u1 = normalizeAffiliateU1(row.u1);
  const match = matchRowToCatalog(row, index);
  return {
    ...row,
    u1,
    sku: match?.catalogSku || row.sku,
    product_id: match?.catalogId || row.product_id,
    raw: {
      ...(row.raw || {}),
      rakuten_sku: row.sku,
      rakuten_product_id: row.product_id,
      catalog_uuid: match?.catalogId || null,
      catalog_sku: match?.catalogSku || null,
      catalog_brand: match?.brandName || null,
      u1_normalized: u1,
    },
  };
}

export async function enrichAffiliateRows(
  supabase: SupabaseClient,
  rows: ParsedAffiliateRow[]
): Promise<Array<ParsedAffiliateRow & { catalog_uuid?: string | null }>> {
  if (!rows.length) return [];
  const index = await buildCatalogMatchIndex(supabase, rows);
  return rows.map((row) => enrichAffiliateRow(row, index));
}
