#!/usr/bin/env node
/**
 * Targeted Rakuten ingest for MID 39906.
 * Qualifying products (≥80% NFP apparel / leather footwear gate) are written
 * by the shared sync pipeline — this script only scopes FTP to the new MID.
 */
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { loadProjectEnv, armLiveIngest } from './lib/load-env.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
loadProjectEnv(root);
armLiveIngest();

process.env.RAKUTEN_FTP_DIR_FILTER = '39906';

const { syncRakutenFeeds, refreshCatalogMaterializedViews } = await import(
  pathToFileURL(path.join(root, 'lib/feed-sync/rakuten-sync.js')).href
);

console.log('INTERTEXE — Rakuten MID 39906 ingest\n');

const result = await syncRakutenFeeds({
  ftpDirFilter: ['39906'],
  fileLimit: Number(process.env.RAKUTEN_CHUNK_FILE_LIMIT || 16),
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
