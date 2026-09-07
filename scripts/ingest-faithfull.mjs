#!/usr/bin/env node
/**
 * Targeted Rakuten ingest for Faithfull the Brand (MID 46961).
 *
 * Usage:
 *   FEED_LIVE_INGEST_ENABLED=1 node scripts/ingest-faithfull.cjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

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

process.env.RAKUTEN_FTP_DIR_FILTER = '46961';
process.env.FEED_LIVE_INGEST_ENABLED = process.env.FEED_LIVE_INGEST_ENABLED || '1';

const { syncRakutenFeeds, refreshCatalogMaterializedViews } = await import(
  pathToFileURL(path.join(root, 'lib/feed-sync/rakuten-sync.js')).href
);

console.log('INTERTEXE — Faithfull the Brand (MID 46961) ingest\n');

const result = await syncRakutenFeeds({
  ftpDirFilter: ['46961'],
  fileLimit: 8,
  forceLive: true,
  markInactive: false,
});

console.log('\nSync result:', JSON.stringify(result, null, 2));

if (String(process.env.CATALOG_MV_REFRESH_AFTER_SYNC || '1') === '1') {
  try {
    const refreshed = await refreshCatalogMaterializedViews();
    console.log('Refreshed materialized views:', refreshed.join(', ') || '(skipped)');
  } catch (err) {
    console.warn('[mv-refresh] failed:', err?.message || err);
  }
}

process.exit(result.ok ? 0 : 1);
