#!/usr/bin/env node
/**
 * Audit all 16 Rakuten MIDs vs live catalog rows (fast per-MID counts).
 *
 * Usage: node scripts/audit-rakuten-merchants.mjs
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { loadProjectEnv } from './lib/load-env.mjs';
import { RAKUTEN_MERCHANTS, RAKUTEN_MERCHANT_MIDS } from '../lib/feed-sync/rakuten-merchants.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
loadProjectEnv(root);

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

async function midStats(mid) {
  const base = () => sb.from('products').select('*', { count: 'exact', head: true }).eq('retailer_mid', mid);
  const [{ count: total }, { count: active }, { count: nfp80 }, { count: shoes }, { data: sample }] =
    await Promise.all([
      base(),
      base().eq('is_active', true),
      base().gte('natural_fiber_percent', 80),
      base().or('category.ilike.%footwear%,category.ilike.%shoe%,name.ilike.%sandal%,name.ilike.%boot%'),
      sb
        .from('products')
        .select('last_seen_at, feed_source, approved')
        .eq('retailer_mid', mid)
        .order('last_seen_at', { ascending: false })
        .limit(1),
    ]);
  return {
    total: total || 0,
    active: active || 0,
    nfp80: nfp80 || 0,
    shoes: shoes || 0,
    lastSeen: sample?.[0]?.last_seen_at || null,
    feedSource: sample?.[0]?.feed_source || '—',
    approved: sample?.[0]?.approved || '—',
  };
}

console.log('INTERTEXE Rakuten MID audit');
console.log(`Registry: ${RAKUTEN_MERCHANT_MIDS.length} tracked MIDs\n`);

const report = [];
for (const def of RAKUTEN_MERCHANTS) {
  const stats = await midStats(def.mid);
  const status =
    stats.active >= 20 ? 'OK' : stats.total > 0 ? 'STALE/THIN' : 'MISSING';
  report.push({
    status,
    mid: def.mid,
    label: def.label,
    total: stats.total,
    live: stats.active,
    nfp80: stats.nfp80,
    shoes: stats.shoes,
    feed_source: stats.feedSource,
    last_seen: stats.lastSeen ? stats.lastSeen.slice(0, 10) : '—',
    ingest: def.dedicatedIngest || 'generic chunk sync',
  });
}

console.table(report);

const missing = report.filter((r) => r.status === 'MISSING');
const thin = report.filter((r) => r.status === 'STALE/THIN');
if (missing.length) {
  console.log(`\n${missing.length} MIDs have zero products — run targeted ingest.`);
  process.exitCode = 1;
}
if (thin.length) {
  console.log(`\n${thin.length} MIDs are stale/thin (<20 live): ${thin.map((r) => r.mid).join(', ')}`);
}
