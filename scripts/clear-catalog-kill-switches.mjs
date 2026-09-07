#!/usr/bin/env node
/**
 * Disarm catalog kill switches so Rakuten live ingest can resume.
 *
 * Usage: node scripts/clear-catalog-kill-switches.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
}

Object.assign(
  process.env,
  loadEnvFile(path.join(root, '.env.production.local')),
  loadEnvFile(path.join(root, '.env.vercel.local')),
  loadEnvFile(path.join(root, '.env.local'))
);

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });
const now = new Date().toISOString();
const clearPayload = {
  blocked: false,
  reason: 'manual_clear_for_rakuten_reconcile',
  at: now,
  setBy: process.env.FEED_SYNC_OWNER || 'clear-catalog-kill-switches',
};

const keys = [
  'catalog_publish_blocked',
  'feed_ingest_blocked',
  'background_jobs_disabled',
  'rakuten_feed_sync_disabled',
];

for (const keyName of keys) {
  await sb.from('system_status').upsert({
    key: keyName,
    value_json: clearPayload,
    updated_at: now,
  });
  console.log(`Cleared ${keyName}`);
}

// Self-heal stuck chunk checkpoint when zero files were ever discovered.
const { data: chunk } = await sb
  .from('system_status')
  .select('value_json')
  .eq('key', 'rakuten_feed_chunk_state')
  .maybeSingle();
const c = chunk?.value_json || {};
if (Number(c.totalCatalogFiles || 0) === 0 && Number(c.nextFileOffset || 0) > 0) {
  await sb.from('system_status').upsert({
    key: 'rakuten_feed_chunk_state',
    value_json: {
      ...c,
      nextFileOffset: 0,
      lastFileOffset: 0,
      listingFailed: false,
      ingestBlocked: false,
      resetReason: 'zero_files_checkpoint_heal',
      updatedAt: now,
    },
    updated_at: now,
  });
  console.log('Reset rakuten_feed_chunk_state offset (was stuck with zero catalog files)');
}

console.log('Kill switches cleared — live ingest may proceed when FEED_LIVE_INGEST_ENABLED=1');
