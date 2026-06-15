#!/usr/bin/env node
/**
 * Sync designers.is_live + product_count from live_products_apparel (all regions).
 * Batched scans + batched updates to avoid statement timeouts.
 */
import { createClient } from '@supabase/supabase-js';

const MIN_LIVE_PRODUCTS = 5;
const SCAN_PAGE_SIZE = 500;
const UPDATE_BATCH_SIZE = 50;
const BATCH_DELAY_MS = 300;
const MAX_SCAN_PAGES = 400;

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required');
  return createClient(url, key, { auth: { persistSession: false } });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function scanLiveBrandCounts(supabase) {
  const brandCounts = new Map();
  let timeouts = 0;

  for (let page = 0; page < MAX_SCAN_PAGES; page++) {
    const offset = page * SCAN_PAGE_SIZE;
    const { data, error } = await supabase
      .from('live_products_apparel')
      .select('brand_slug')
      .not('brand_slug', 'is', null)
      .range(offset, offset + SCAN_PAGE_SIZE - 1);

    if (error) {
      if (error.code === '57014' || String(error.message || '').includes('timeout')) {
        timeouts += 1;
        console.warn(`[designer-sync] scan timeout at offset ${offset}, retrying…`);
        await sleep(BATCH_DELAY_MS * 2);
        page -= 1;
        continue;
      }
      throw error;
    }

    if (!data?.length) break;

    for (const row of data) {
      const slug = String(row.brand_slug || '').trim().toLowerCase();
      if (!slug) continue;
      brandCounts.set(slug, (brandCounts.get(slug) || 0) + 1);
    }

    if (page % 10 === 0) {
      console.log(`[designer-sync] scanned offset ${offset}, brands so far ${brandCounts.size}`);
    }

    if (data.length < SCAN_PAGE_SIZE) break;
    await sleep(BATCH_DELAY_MS);
  }

  return { brandCounts, timeouts };
}

async function fetchDesignerSlugsBatched(supabase) {
  const slugs = [];
  for (let offset = 0; offset < 50000; offset += SCAN_PAGE_SIZE) {
    const { data, error } = await supabase
      .from('designers')
      .select('slug')
      .range(offset, offset + SCAN_PAGE_SIZE - 1);

    if (error) throw error;
    if (!data?.length) break;
    for (const row of data) {
      const slug = String(row.slug || '').trim().toLowerCase();
      if (slug) slugs.push(slug);
    }
    if (data.length < SCAN_PAGE_SIZE) break;
    await sleep(100);
  }
  return slugs;
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

  console.log('[designer-sync] scanning live_products_apparel…');
  const { brandCounts, timeouts: scanTimeouts } = await scanLiveBrandCounts(supabase);
  timeouts += scanTimeouts;
  console.log(`[designer-sync] catalog brands: ${brandCounts.size}`);

  const designerSlugs = await fetchDesignerSlugsBatched(supabase);
  console.log(`[designer-sync] updating ${designerSlugs.length} designers in batches of ${UPDATE_BATCH_SIZE}…`);

  for (let i = 0; i < designerSlugs.length; i += UPDATE_BATCH_SIZE) {
    const batch = designerSlugs.slice(i, i + UPDATE_BATCH_SIZE);
    try {
      const { updated, live } = await updateDesignerBatch(supabase, batch, brandCounts, syncedAt);
      totalUpdated += updated;
      totalLive += live;
      console.log(`[designer-sync] updated ${totalUpdated}/${designerSlugs.length}, live ${totalLive}`);
    } catch (err) {
      if (err?.code === '57014') {
        timeouts += 1;
        console.warn('[designer-sync] update batch timeout, retrying…');
        i -= UPDATE_BATCH_SIZE;
        await sleep(BATCH_DELAY_MS * 2);
        continue;
      }
      throw err;
    }
    await sleep(BATCH_DELAY_MS);
  }

  const summary = {
    updated: totalUpdated,
    live: totalLive,
    catalog_brands: brandCounts.size,
    min_live_products: MIN_LIVE_PRODUCTS,
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
