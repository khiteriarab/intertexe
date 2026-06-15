#!/usr/bin/env node
/**
 * Recalculate natural_fiber_percent and approved/is_active for products
 * that have composition but stale approval (pending) or zero NFP.
 */
import { createClient } from '@supabase/supabase-js';
import {
  naturalFiberPercent,
  approvalStatus,
  classifyGenderScope,
} from '../lib/feed-sync/rakuten-sync.js';

const PAGE_SIZE = 500;
const MAX_ROWS = 20000;

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required');
  return createClient(url, key, { auth: { persistSession: false } });
}

function isAvailable(product) {
  const status = String(product.stock_status || '').toLowerCase();
  if (!status) return product.is_active !== false;
  return !/(out_of_stock|sold_out|unavailable)/.test(status);
}

async function backfillNFP() {
  const supabase = getSupabase();
  let offset = 0;
  let scanned = 0;
  let updated = 0;
  let nowApproved = 0;
  let redoneLive = 0;

  while (offset < MAX_ROWS) {
    const { data: products, error } = await supabase
      .from('products')
      .select('id, product_id, name, category, composition, url, gender_scope, approved, is_active, natural_fiber_percent, stock_status, brand_name, brand_slug')
      .not('composition', 'is', null)
      .neq('composition', '')
      .or('natural_fiber_percent.is.null,natural_fiber_percent.eq.0,approved.eq.pending,approved.is.null')
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw error;
    if (!products?.length) break;

    for (const product of products) {
      scanned += 1;
      const composition = String(product.composition || '').trim();
      if (!composition) continue;

      const nfp = naturalFiberPercent(composition);
      if (nfp == null) continue;

      const genderScope = classifyGenderScope({
        category: product.category || '',
        name: product.name || '',
        url: product.url || '',
        gender: product.gender_scope || '',
      });
      const approved = approvalStatus(nfp, composition, product.category || '', product.name || '', genderScope);
      const live = approved === 'yes' && nfp >= 80 && isAvailable(product);

      const patch = {
        natural_fiber_percent: nfp,
        approved,
        is_active: live,
        updated_at: new Date().toISOString(),
      };

      const unchanged =
        product.natural_fiber_percent === nfp &&
        product.approved === approved &&
        product.is_active === live;
      if (unchanged) continue;

      const { error: updateError } = await supabase
        .from('products')
        .update(patch)
        .eq('id', product.id);
      if (updateError) {
        console.error('Update failed', product.product_id, updateError.message);
        continue;
      }

      updated += 1;
      if (approved === 'yes' && live) {
        nowApproved += 1;
        const brand = String(product.brand_name || product.brand_slug || '').toLowerCase();
        if (brand.includes('re/done') || brand.includes('redone')) {
          redoneLive += 1;
        }
      }
    }

    offset += PAGE_SIZE;
    if (products.length < PAGE_SIZE) break;
  }

  const summary = { scanned, updated, nowApproved, redoneLive };
  console.log('NFP backfill complete:', JSON.stringify(summary, null, 2));

  try {
    await supabase.from('sync_logs').insert({
      run_at: new Date().toISOString(),
      stats: summary,
      status: 'success',
      source: 'backfill-nfp',
    });
  } catch {
    // sync_logs table may not exist yet
  }

  return summary;
}

backfillNFP().catch((err) => {
  console.error(err);
  process.exit(1);
});
