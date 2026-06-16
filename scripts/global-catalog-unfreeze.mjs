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

const BATCH_SIZE = 200;
const UPDATE_CHUNK = 50;
const BATCH_DELAY_MS = 500;
const MAX_RETRIES = 5;

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

function isTransient(err) {
  const msg = String(err?.message || err || '');
  return (
    err?.code === '57014'
    || msg.includes('timeout')
    || msg.includes('fetch failed')
    || msg.includes('ECONNRESET')
    || msg.includes('socket')
  );
}

async function fetchPendingBatch(sb, afterId) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    let query = sb
      .from('products')
      .select(
        'id, product_id, name, category, composition, url, gender_scope, is_active, natural_fiber_percent, stock_status, brand_name, brand_slug, image_url, price'
      )
      .gte('natural_fiber_percent', 80)
      .not('composition', 'is', null)
      .neq('composition', '')
      .neq('approved', 'yes')
      .order('id', { ascending: true })
      .limit(BATCH_SIZE);

    if (afterId) query = query.gt('id', afterId);

    const { data, error } = await query;
    if (!error) return { data: data || [], error: null };
    if (isTransient(error) && attempt < MAX_RETRIES) {
      console.warn(`[unfreeze] select retry ${attempt + 1}/${MAX_RETRIES}:`, error.message);
      await sleep(BATCH_DELAY_MS * (attempt + 2));
      continue;
    }
    return { data: [], error };
  }
  return { data: [], error: new Error('max retries') };
}

function resolveGenderScope(product) {
  const genderScope = classifyGenderScope({
    category: product.category || '',
    name: product.name || '',
    url: product.url || '',
    gender: product.gender_scope || '',
  });
  if (genderScope !== 'unknown') return genderScope;

  const cat = String(product.category || '').toLowerCase();
  const nam = String(product.name || '').toLowerCase();
  const u = String(product.url || '').toLowerCase();
  const blob = `${cat} ${nam} ${u}`;
  if (/(\bmen\b|\bmens\b|menswear|\/men\/|\/mens\/|\bboys\b|for him\b)/i.test(blob)) return 'men';

  // Generic Rakuten categories (e.g. "Apparel & Accessories") — default women's unless men's signals above.
  if (
    cat.includes('apparel')
    || cat.includes('trouser')
    || cat.includes('knitwear')
    || cat.includes('dress')
    || cat.includes('skirt')
    || cat.includes('blouse')
    || cat.includes('top')
    || cat.includes('jacket')
    || cat.includes('coat')
  ) {
    return 'women';
  }
  return 'unknown';
}

function resolveNfp(product, composition) {
  const parsed = naturalFiberPercent(composition);
  const stored = product.natural_fiber_percent;
  if (parsed != null && parsed > 0) return parsed;
  if (stored != null && Number(stored) >= 80) return Number(stored);
  return parsed ?? stored;
}

function candidatesForApproval(rows) {
  const activeIds = [];
  const inactiveIds = [];
  const brandsTouched = new Set();

  for (const product of rows) {
    if (!product.image_url?.trim() || !hasPositivePrice(product.price)) continue;

    const composition = String(product.composition || '').trim();
    const nfp = resolveNfp(product, composition);
    if (nfp == null || nfp < 80) continue;

    const genderScope = resolveGenderScope(product);
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
  let afterId = null;
  const brandsTouched = new Set();

  while (true) {
    batches += 1;
    console.log(`[unfreeze] batch ${batches} — fetching next ${BATCH_SIZE} pending…`);

    const { data, error } = await fetchPendingBatch(sb, afterId);

    if (error) {
      if (isTransient(error)) {
        timeouts += 1;
        console.error('[unfreeze] select failed after retries — pausing…', error.message);
        await sleep(BATCH_DELAY_MS * 4);
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

    afterId = data[data.length - 1]?.id ?? afterId;
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
