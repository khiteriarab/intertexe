#!/usr/bin/env node
/**
 * Sync designers.is_live + product_count from live_products_apparel (all regions).
 * Called at end of full Rakuten sync cycle.
 */
import { createClient } from '@supabase/supabase-js';

const MIN_LIVE_PRODUCTS = 5;
const PAGE_SIZE = 1000;
const MAX_PAGES = 200;

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required');
  return createClient(url, key, { auth: { persistSession: false } });
}

async function syncDesignersFromProducts() {
  const supabase = getSupabase();
  const brandCounts = new Map();

  for (let page = 0; page < MAX_PAGES; page++) {
    const offset = page * PAGE_SIZE;
    const { data, error } = await supabase
      .from('live_products_apparel')
      .select('brand_slug')
      .not('brand_slug', 'is', null)
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data?.length) break;

    for (const row of data) {
      const slug = String(row.brand_slug || '').trim().toLowerCase();
      if (!slug) continue;
      brandCounts.set(slug, (brandCounts.get(slug) || 0) + 1);
    }

    if (data.length < PAGE_SIZE) break;
  }

  const { data: designers, error: designersError } = await supabase.from('designers').select('slug');
  if (designersError) throw designersError;

  const syncedAt = new Date().toISOString();
  let updated = 0;
  let live = 0;

  for (const row of designers || []) {
    const slug = String(row.slug || '').trim().toLowerCase();
    if (!slug) continue;
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

  const summary = {
    updated,
    live,
    catalog_brands: brandCounts.size,
    min_live_products: MIN_LIVE_PRODUCTS,
    at: syncedAt,
  };
  console.log('Designer sync complete:', JSON.stringify(summary, null, 2));
  return summary;
}

syncDesignersFromProducts().catch((err) => {
  console.error(err);
  process.exit(1);
});
