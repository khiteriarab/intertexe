#!/usr/bin/env node
/**
 * Global approval unfreeze — all brands, batched to avoid statement timeouts.
 * Always reads from offset 0 (approved rows leave the filter between batches).
 */
import { createClient } from '@supabase/supabase-js';
import {
  naturalFiberPercent,
  approvalStatus,
  classifyGenderScope,
} from '../lib/feed-sync/rakuten-sync.js';

const BATCH_SIZE = 500;
const UPDATE_CHUNK = 50;
const BATCH_DELAY_MS = 500;

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function candidatesForApproval(rows) {
  const activeIds = [];
  const inactiveIds = [];
  const brandsTouched = new Set();

  for (const product of rows) {
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
    const approvedStatus = approvalStatus(
      nfp,
      composition,
      product.category || '',
      product.name || '',
      genderScope
    );
    if (approvedStatus !== 'yes') continue;

    if (isAvailable(product)) activeIds.push(product.id);
    else inactiveIds.push(product.id);
    brandsTouched.add(String(product.brand_slug || product.brand_name || 'unknown'));
  }

  return { activeIds, inactiveIds, brandsTouched };
}

async function updateChunk(sb, ids, isActive, dryRun) {
  if (!ids.length || dryRun) return { ok: true, count: ids.length };
  const { error } = await sb
    .from('products')
    .update({
      approved: 'yes',
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .in('id', ids);
  return { ok: !error, count: error ? 0 : ids.length, error };
}

async function runBatchedUnfreeze() {
  const dryRun = process.argv.includes('--dry-run');
  const sb = getSupabase();
  let scanned = 0;
  let approved = 0;
  let batches = 0;
  let timeouts = 0;
  const brandsTouched = new Set();

  while (true) {
    batches += 1;
    console.log(`[unfreeze] batch ${batches} — fetching next ${BATCH_SIZE} pending…`);

    const { data, error } = await sb
      .from('products')
      .select(
        'id, product_id, name, category, composition, url, gender_scope, is_active, natural_fiber_percent, stock_status, brand_name, brand_slug, image_url, price'
      )
      .gte('natural_fiber_percent', 80)
      .not('composition', 'is', null)
      .neq('composition', '')
      .neq('approved', 'yes')
      .range(0, BATCH_SIZE - 1);

    if (error) {
      if (error.code === '57014' || String(error.message || '').includes('timeout')) {
        timeouts += 1;
        console.error('[unfreeze] select timeout — retrying after delay…', error.message);
        await sleep(BATCH_DELAY_MS * 2);
        continue;
      }
      throw error;
    }

    if (!data?.length) {
      console.log('[unfreeze] no more pending products');
      break;
    }

    scanned += data.length;
    const { activeIds, inactiveIds, brandsTouched: batchBrands } = candidatesForApproval(data);
    for (const b of batchBrands) brandsTouched.add(b);

    const allIds = [...activeIds, ...inactiveIds];
    for (let i = 0; i < activeIds.length; i += UPDATE_CHUNK) {
      const chunk = activeIds.slice(i, i + UPDATE_CHUNK);
      const result = await updateChunk(sb, chunk, true, dryRun);
      if (!result.ok) {
        console.error('[unfreeze] active chunk update failed:', result.error?.message);
        if (result.error?.code === '57014') timeouts += 1;
      } else {
        approved += result.count;
      }
    }
    for (let i = 0; i < inactiveIds.length; i += UPDATE_CHUNK) {
      const chunk = inactiveIds.slice(i, i + UPDATE_CHUNK);
      const result = await updateChunk(sb, chunk, false, dryRun);
      if (!result.ok) {
        console.error('[unfreeze] inactive chunk update failed:', result.error?.message);
        if (result.error?.code === '57014') timeouts += 1;
      } else {
        approved += result.count;
      }
    }

    console.log(
      `[unfreeze] batch ${batches} fetched ${data.length}, approved ${allIds.length} this batch, total ${approved}`
    );

    if (data.length < BATCH_SIZE) break;
    await sleep(BATCH_DELAY_MS);
  }

  const summary = {
    dry_run: dryRun,
    batches,
    scanned,
    products_approved: approved,
    brands_touched: brandsTouched.size,
    timeouts,
  };
  console.log('COMPLETE.', JSON.stringify(summary, null, 2));

  if (!dryRun) {
    try {
      await sb.from('sync_logs').insert({
        run_at: new Date().toISOString(),
        stats: summary,
        status: timeouts > 0 ? 'partial' : 'success',
        source: 'global-catalog-unfreeze',
      });
    } catch {
      /* sync_logs optional */
    }
  }

  return summary;
}

runBatchedUnfreeze().catch((e) => {
  console.error(e);
  process.exit(1);
});
