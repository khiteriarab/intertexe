#!/usr/bin/env node
/**
 * Backfill products.retailer_mid from feed_url / FTP path when ingest omitted it.
 * Safe to run after reconcile — does not change is_active or composition.
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { loadProjectEnv } from './lib/load-env.mjs';
import { RAKUTEN_MERCHANT_MIDS } from '../lib/feed-sync/rakuten-merchants.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
loadProjectEnv(root);

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });
const mids = new Set(RAKUTEN_MERCHANT_MIDS);
const dryRun = process.argv.includes('--dry-run');

function midFromFeedUrl(feedUrl) {
  if (!feedUrl) return null;
  const m = String(feedUrl).match(/\/(\d{5})_\d+_/);
  return m?.[1] || null;
}

let offset = 0;
const page = 500;
let scanned = 0;
let updated = 0;

while (true) {
  const { data, error } = await sb
    .from('products')
    .select('id, retailer_mid, feed_url, feed_source')
    .is('retailer_mid', null)
    .not('feed_url', 'is', null)
    .range(offset, offset + page - 1);
  if (error) {
    console.error(error.message);
    process.exit(1);
  }
  if (!data?.length) break;

  for (const row of data) {
    scanned += 1;
    const mid = midFromFeedUrl(row.feed_url);
    if (!mid || !mids.has(mid)) continue;
    updated += 1;
    if (dryRun) continue;
    await sb
      .from('products')
      .update({ retailer_mid: mid, updated_at: new Date().toISOString() })
      .eq('id', row.id);
  }

  if (data.length < page) break;
  offset += page;
}

console.log(JSON.stringify({ dryRun, scanned, retailerMidBackfilled: updated }, null, 2));
