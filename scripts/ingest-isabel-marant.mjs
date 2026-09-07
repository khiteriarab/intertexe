#!/usr/bin/env node
/** Targeted Rakuten ingest for Isabel Marant (MID 49987). */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { loadProjectEnv } from './lib/load-env.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
loadProjectEnv(root);

process.env.RAKUTEN_FTP_DIR_FILTER = '49987';
process.env.FEED_LIVE_INGEST_ENABLED = process.env.FEED_LIVE_INGEST_ENABLED || '1';

const { syncRakutenFeeds, refreshCatalogMaterializedViews } = await import(
  pathToFileURL(path.join(root, 'lib/feed-sync/rakuten-sync.js')).href
);

console.log('INTERTEXE — Isabel Marant (MID 49987) ingest\n');

const result = await syncRakutenFeeds({
  ftpDirFilter: ['49987'],
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
