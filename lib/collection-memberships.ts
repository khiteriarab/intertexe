/**
 * Precomputed editorial collection memberships — full catalog depth via pagination.
 */
import type { CollectionSlug } from "./collection-pages";
import {
  COLLECTION_CATALOG_QUERIES,
  buildRankedCollectionCatalog,
  isCollectionEligible,
} from "./collection-catalog";
import { catalogDedupeKey } from "./catalog-rules";
import type { Product } from "./supabase-server";
import { getServerSupabase, mapProductRow } from "./supabase-server";

const MEMBERSHIP_PAGE_SIZE = 500;
const MEMBERSHIP_INSERT_BATCH = 400;

/** Paginated read from precomputed memberships (full collection, not shallow pool). */
export async function fetchCollectionPageFromMemberships(
  slug: CollectionSlug,
  opts?: { limit?: number; offset?: number; skipCount?: boolean }
): Promise<{ products: Product[]; total: number } | null> {
  const supabase = getServerSupabase();
  if (!supabase) return null;

  const limit = Math.min(Math.max(opts?.limit ?? 48, 1), 100);
  const offset = Math.max(opts?.offset ?? 0, 0);
  const skipCount = opts?.skipCount ?? false;

  const listPromise = supabase.rpc("collection_catalog_list", {
    p_slug: slug,
    p_limit: limit,
    p_offset: offset,
  });

  let rows: Record<string, unknown>[] | null = null;
  let error: { message?: string } | null = null;
  let countRaw: unknown = 0;

  if (skipCount) {
    const listRes = await listPromise;
    rows = listRes.data as Record<string, unknown>[] | null;
    error = listRes.error;
  } else {
    const [listRes, countRes] = await Promise.all([
      listPromise,
      supabase.rpc("collection_catalog_count", { p_slug: slug }),
    ]);
    rows = listRes.data as Record<string, unknown>[] | null;
    error = listRes.error;
    if (countRes.error?.message?.includes("collection_catalog_count")) return null;
    countRaw = countRes.data;
  }

  if (error?.message?.includes("collection_catalog_list")) return null;

  const total = skipCount ? rows?.length ?? 0 : Number(countRaw ?? 0);
  if (!skipCount && total === 0 && (!rows || rows.length === 0)) return null;
  if (skipCount && (!rows || rows.length === 0)) return null;

  const products = (rows || []).map((row: Record<string, unknown>) => mapProductRow(row));
  return { products, total };
}

/** Scan full catalog_list branches and rebuild memberships for one or all collections. */
export async function refreshCollectionMemberships(
  slug?: CollectionSlug
): Promise<Record<string, number>> {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error("Supabase not configured");

  const slugs: CollectionSlug[] = slug
    ? [slug]
    : (["vacation", "evening", "tailoring", "summer-in-the-city", "white-edit"] as CollectionSlug[]);

  const counts: Record<string, number> = {};

  for (const collectionSlug of slugs) {
    const queries = COLLECTION_CATALOG_QUERIES[collectionSlug];
    const merged = new Map<string, Product>();

    for (const q of queries) {
      let offset = 0;
      for (;;) {
        const { data: rows, error } = await supabase.rpc("catalog_list", {
          p_preferred_region: "us",
          p_fallback_region: "us",
          p_fiber: q.fiber ?? null,
          p_category: q.category ?? null,
          p_brand_slug: null,
          p_search: q.search ?? null,
          p_min_nfp: 80,
          p_limit: MEMBERSHIP_PAGE_SIZE,
          p_offset: offset,
        });
        if (error) {
          console.warn(`[collection-memberships] catalog_list ${collectionSlug}`, error.message);
          break;
        }
        const batch = (rows || []) as Record<string, unknown>[];
        if (batch.length === 0) break;

        for (const row of batch) {
          const product = mapProductRow(row);
          if (!isCollectionEligible(product, collectionSlug)) continue;
          const key = catalogDedupeKey(row);
          if (!merged.has(key)) merged.set(key, product);
        }

        offset += batch.length;
        if (batch.length < MEMBERSHIP_PAGE_SIZE) break;
      }
    }

    const ranked = buildRankedCollectionCatalog([...merged.values()], collectionSlug);

    await supabase
      .from("collection_product_memberships")
      .delete()
      .eq("collection_slug", collectionSlug);

    for (let i = 0; i < ranked.length; i += MEMBERSHIP_INSERT_BATCH) {
      const slice = ranked.slice(i, i + MEMBERSHIP_INSERT_BATCH);
      const payload = slice.map((p, idx) => ({
        collection_slug: collectionSlug,
        offer_id: p.id,
        product_id: p.productId || p.id,
        rank_score: ranked.length - (i + idx),
        refreshed_at: new Date().toISOString(),
      }));
      const { error: insErr } = await supabase
        .from("collection_product_memberships")
        .insert(payload);
      if (insErr) {
        throw new Error(
          `[collection-memberships] insert ${collectionSlug}: ${insErr.message} — apply migration 20240034 in Supabase SQL Editor first`
        );
      }
    }

    const { count: persisted, error: countErr } = await supabase
      .from("collection_product_memberships")
      .select("offer_id", { count: "exact", head: true })
      .eq("collection_slug", collectionSlug);
    if (countErr) throw countErr;
    counts[collectionSlug] = persisted ?? ranked.length;
    console.log(`[collection-memberships] ${collectionSlug} → ${ranked.length} members`);
  }

  return counts;
}
