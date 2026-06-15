#!/usr/bin/env node
/**
 * Global approval unfreeze — all brands, not just Re/Done.
 * Approves products with NFP >= 80, composition, image, and positive price.
 */
import { createClient } from '@supabase/supabase-js';
import {
  naturalFiberPercent,
  approvalStatus,
  classifyGenderScope,
} from '../lib/feed-sync/rakuten-sync.js';

const PAGE_SIZE = 500;

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

function isAvailable(product) {
  const status = String(product.stock_status || '').toLowerCase();
  if (!status) return product.is_active !== false;
  return !/(out_of_stock|sold_out|unavailable)/.test(status);
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const sb = getSupabase();
  let scanned = 0;
  let approved = 0;
  const brandsTouched = new Set();

  for (let offset = 0; offset < 200000; offset += PAGE_SIZE) {
    const { data, error } = await sb
      .from('products')
      .select('id, product_id, name, category, composition, url, gender_scope, approved, is_active, natural_fiber_percent, stock_status, brand_name, brand_slug, image_url, price')
      .gte('natural_fiber_percent', 80)
      .not('composition', 'is', null)
      .neq('composition', '')
      .neq('approved', 'yes')
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data?.length) break;

    for (const product of data) {
      scanned += 1;
      if (!product.image_url?.trim() || !hasPositivePrice(product.price)) continue;

      const composition = String(product.composition || '').trim();
      const nfp = naturalFiberPercent(composition) ?? product.natural_fiber_percent;
      if (nfp == null || nfp < 80) continue;

      const genderScope = classifyGenderScope({
        category: product.category || '',
        name: product.name || '',
        url: product.url || '',
        gender: product.gender_scope || '',
      });
      const approvedStatus = approvalStatus(nfp, composition, product.category || '', product.name || '', genderScope);
      if (approvedStatus !== 'yes') continue;

      const live = isAvailable(product);
      if (dryRun) {
        approved += 1;
        brandsTouched.add(String(product.brand_slug || product.brand_name || 'unknown'));
        continue;
      }

      const { error: updateError } = await sb
        .from('products')
        .update({
          approved: 'yes',
          is_active: live,
          natural_fiber_percent: nfp,
          updated_at: new Date().toISOString(),
        })
        .eq('id', product.id);

      if (updateError) {
        console.error('update failed', product.product_id, updateError.message);
        continue;
      }
      approved += 1;
      brandsTouched.add(String(product.brand_slug || product.brand_name || 'unknown'));
    }

    console.log(`[unfreeze] offset ${offset} scanned ${scanned} approved ${approved}`);
    if (data.length < PAGE_SIZE) break;
  }

  const summary = {
    dry_run: dryRun,
    scanned,
    products_approved: approved,
    brands_touched: brandsTouched.size,
  };
  console.log(JSON.stringify(summary, null, 2));

  if (!dryRun) {
    try {
      await sb.from('sync_logs').insert({
        run_at: new Date().toISOString(),
        stats: summary,
        status: 'success',
        source: 'global-catalog-unfreeze',
      });
    } catch {
      /* sync_logs optional */
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
