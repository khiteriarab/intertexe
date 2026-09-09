#!/usr/bin/env node
/** Per-MID shoppable counts (head count — not capped at PostgREST row limit). */
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { loadProjectEnv } from './lib/load-env.mjs';
import { RAKUTEN_MERCHANTS } from '../lib/feed-sync/rakuten-merchants.js';

const QUERY_MS = Number(process.env.PROBE_MID_TIMEOUT_MS || 60000);

function withTimeout(promise, ms = QUERY_MS) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
loadProjectEnv(root);

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

async function countRows(filter) {
  const { count, error } = await withTimeout(
    filter(sb.from('products').select('*', { count: 'exact', head: true }))
  );
  if (error) throw error;
  return count || 0;
}

async function midCounts(mid) {
  const shoppable = () =>
    sb
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('retailer_mid', mid)
      .eq('is_active', true)
      .eq('is_displayable', true)
      .gte('natural_fiber_percent', 80)
      .not('image_url', 'is', null);

  const live = () =>
    sb.from('products').select('*', { count: 'exact', head: true }).eq('retailer_mid', mid).eq('is_active', true);

  const total = () => sb.from('products').select('*', { count: 'exact', head: true }).eq('retailer_mid', mid);

  let shoppableCount = 0;
  let liveCount = 0;
  let totalCount = 0;
  let error = null;

  try {
    totalCount = await countRows(total);
    liveCount = await countRows(live);
    shoppableCount = await countRows(shoppable);
  } catch (err) {
    error = { message: String(err?.message || err) };
  }

  let lastSeen = '—';
  try {
    const { data: sample } = await withTimeout(
      sb
        .from('products')
        .select('last_seen_at, retailer_mid')
        .eq('retailer_mid', mid)
        .order('last_seen_at', { ascending: false })
        .limit(1)
    );
    if (sample?.[0]?.last_seen_at) lastSeen = sample[0].last_seen_at.slice(0, 10);
    else if (!totalCount) {
      const { data: feedSample } = await withTimeout(
        sb
          .from('products')
          .select('last_seen_at, retailer_mid')
          .ilike('feed_url', `%${mid}_%`)
          .order('last_seen_at', { ascending: false })
          .limit(1)
      );
      if (feedSample?.[0]?.last_seen_at) lastSeen = feedSample[0].last_seen_at.slice(0, 10);
    }
  } catch {
    // keep lastSeen as —
  }

  return { totalCount, liveCount, shoppableCount, lastSeen, error };
}

const report = [];
for (const def of RAKUTEN_MERCHANTS) {
  const mid = def.mid;
  const stats = await midCounts(mid);
  const status =
    stats.shoppableCount >= 20
      ? 'OK'
      : stats.shoppableCount > 0
        ? 'THIN'
        : stats.error
          ? 'ERR'
          : stats.totalCount > 0
            ? 'STALE'
            : 'MISSING';

  report.push({
    status,
    mid,
    label: def.label,
    total: stats.totalCount,
    live: stats.liveCount,
    shoppable_nfp80: stats.shoppableCount,
    last_seen: stats.lastSeen,
    note: stats.error?.message?.slice(0, 40) || '',
  });
}

console.table(report);
const bad = report.filter((r) => r.status !== 'OK');
process.exitCode = bad.length ? 1 : 0;
