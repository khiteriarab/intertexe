#!/usr/bin/env node
/** Full brand health audit — every brand with products stuck pending approval. */
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required');
  return createClient(url, key, { auth: { persistSession: false } });
}

function hasPositivePrice(price) {
  if (price == null) return false;
  const n = parseFloat(String(price).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) && n > 0;
}

async function main() {
  const sb = getSupabase();
  const byBrand = new Map();
  let shouldBeLive = 0;

  for (let offset = 0; offset < 200000; offset += 1000) {
    const { data, error } = await sb
      .from('products')
      .select('brand_name, brand_slug, approved, is_active, natural_fiber_percent, composition, image_url, price, region, category')
      .range(offset, offset + 999);
    if (error) throw error;
    if (!data?.length) break;

    for (const p of data) {
      const nfp = p.natural_fiber_percent ?? 0;
      const comp = String(p.composition || '').trim();
      if (nfp < 80 || !comp) continue;
      if (!p.image_url?.trim() || !hasPositivePrice(p.price)) continue;
      if (p.approved === 'yes' && p.is_active) continue;

      shouldBeLive += 1;
      const slug = String(p.brand_slug || 'unknown').toLowerCase();
      const cur = byBrand.get(slug) || {
        brand_name: p.brand_name || slug,
        brand_slug: slug,
        should_be_live: 0,
        total: 0,
      };
      cur.should_be_live += 1;
      byBrand.set(slug, cur);
    }

    if (data.length < 1000) break;
  }

  const top = [...byBrand.values()].sort((a, b) => b.should_be_live - a.should_be_live).slice(0, 25);

  const { count: liveTotal } = await sb.from('live_products_apparel').select('*', { count: 'exact', head: true });
  const { count: productsTotal } = await sb.from('products').select('*', { count: 'exact', head: true });

  const report = {
    products_total: productsTotal,
    live_apparel_total: liveTotal,
    should_be_live_not_approved: shouldBeLive,
    brands_affected: byBrand.size,
    top_brands: top,
  };

  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
