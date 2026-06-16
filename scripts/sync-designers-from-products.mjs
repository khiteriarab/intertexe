#!/usr/bin/env node
/**
 * Sync designers.is_live + product_count from live catalog.
 * Counts per designer slug (fast head queries) instead of scanning the full view.
 */
import { createClient } from '@supabase/supabase-js';

const MIN_LIVE_PRODUCTS = 5;
const UPDATE_BATCH_SIZE = 50;
const COUNT_BATCH_SIZE = 20;
const BATCH_DELAY_MS = 200;

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required');
  return createClient(url, key, { auth: { persistSession: false } });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransient(err) {
  const msg = String(err?.message || err || '');
  return (
    err?.code === '57014'
    || msg.includes('timeout')
    || msg.includes('fetch failed')
    || msg.includes('socket')
  );
}

async function fetchAllDesignerSlugs(supabase) {
  const slugs = [];
  for (let offset = 0; offset < 50000; offset += 500) {
    const { data, error } = await supabase.from('designers').select('slug').range(offset, offset + 499);
    if (error) throw error;
    if (!data?.length) break;
    for (const row of data) {
      const slug = String(row.slug || '').trim().toLowerCase();
      if (slug) slugs.push(slug);
    }
    if (data.length < 500) break;
  }
  return slugs;
}

async function fetchCandidateBrandSlugs(supabase) {
  const slugs = new Set();
  for (let offset = 0; offset < 200000; offset += 500) {
    const { data, error } = await supabase
      .from('products')
      .select('brand_slug')
      .eq('approved', 'yes')
      .gte('natural_fiber_percent', 80)
      .not('brand_slug', 'is', null)
      .range(offset, offset + 499);
    if (error) {
      if (isTransient(error)) {
        await sleep(BATCH_DELAY_MS * 2);
        continue;
      }
      throw error;
    }
    if (!data?.length) break;
    for (const row of data) {
      const slug = String(row.brand_slug || '').trim().toLowerCase();
      if (slug) slugs.add(slug);
    }
    if (data.length < 500) break;
    if (offset % 5000 === 0) console.log(`[designer-sync] distinct brand slugs so far: ${slugs.size}`);
    await sleep(100);
  }
  return [...slugs];
}

async function countLiveProductsForBrand(supabase, slug) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const { count, error } = await supabase
      .from('live_products_apparel')
      .select('id', { count: 'exact', head: true })
      .eq('brand_slug', slug);

    if (!error) return count ?? 0;
    if (isTransient(error) && attempt < 2) {
      await sleep(BATCH_DELAY_MS * (attempt + 2));
      continue;
    }
    return 0;
  }
  return 0;
}

async function buildBrandCounts(supabase, slugs) {
  const brandCounts = new Map();
  let timeouts = 0;

  for (let i = 0; i < slugs.length; i += COUNT_BATCH_SIZE) {
    const batch = slugs.slice(i, i + COUNT_BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (slug) => {
        try {
          const count = await countLiveProductsForBrand(supabase, slug);
          return { slug, count };
        } catch {
          timeouts += 1;
          return { slug, count: 0 };
        }
      })
    );
    for (const { slug, count } of results) {
      if (count > 0) brandCounts.set(slug, count);
    }
    if (i % 100 === 0) {
      console.log(`[designer-sync] counted ${Math.min(i + COUNT_BATCH_SIZE, slugs.length)}/${slugs.length} designers…`);
    }
    await sleep(BATCH_DELAY_MS);
  }

  return { brandCounts, timeouts };
}

async function updateDesignerBatch(supabase, batch, brandCounts, syncedAt) {
  let updated = 0;
  let live = 0;

  for (const slug of batch) {
    const count = brandCounts.get(slug) || 0;
    const isLive = count >= MIN_LIVE_PRODUCTS;
    if (isLive) live += 1;

    const { error } = await supabase
      .from('designers')
      .update({
        is_live: isLive,
        product_count: count,
        last_synced_at: syncedAt,
      })
      .eq('slug', slug);

    if (!error) updated += 1;
  }

  return { updated, live };
}

async function runBatchedDesignerSync() {
  const supabase = getSupabase();
  const syncedAt = new Date().toISOString();
  let totalUpdated = 0;
  let totalLive = 0;
  let timeouts = 0;

  const candidateSlugs = await fetchCandidateBrandSlugs(supabase);
  const designerSlugs = await fetchAllDesignerSlugs(supabase);
  console.log(
    `[designer-sync] counting live products for ${candidateSlugs.length} approved brands (${designerSlugs.length} designer rows)…`
  );

  const { brandCounts, timeouts: countTimeouts } = await buildBrandCounts(supabase, candidateSlugs);
  timeouts += countTimeouts;
  console.log(`[designer-sync] ${brandCounts.size} brands with live products`);

  console.log(`[designer-sync] updating designers in batches of ${UPDATE_BATCH_SIZE}…`);
  for (let i = 0; i < designerSlugs.length; i += UPDATE_BATCH_SIZE) {
    const batch = designerSlugs.slice(i, i + UPDATE_BATCH_SIZE);
    const { updated, live } = await updateDesignerBatch(supabase, batch, brandCounts, syncedAt);
    totalUpdated += updated;
    totalLive += live;
    console.log(`[designer-sync] updated ${totalUpdated}/${designerSlugs.length}, live ${totalLive}`);
    await sleep(BATCH_DELAY_MS);
  }

  const summary = {
    updated: totalUpdated,
    live: totalLive,
    catalog_brands: brandCounts.size,
    min_live_products: MIN_LIVE_PRODUCTS,
    source: 'per-slug-count',
    timeouts,
    at: syncedAt,
  };
  console.log('Designer sync complete:', JSON.stringify(summary, null, 2));
  return summary;
}

runBatchedDesignerSync().catch((err) => {
  console.error(err);
  process.exit(1);
});
