#!/usr/bin/env node
/**
 * Pull all 16 Rakuten MIDs via generic sync (FTP filter).
 * For heavy feeds (MyTheresa, Bloomingdale's, Simon, Fleur du Mal) also run
 * dedicated scripts after this completes.
 *
 * Usage:
 *   FEED_LIVE_INGEST_ENABLED=1 node scripts/ingest-all-rakuten-merchants.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { loadProjectEnv, armLiveIngest } from './lib/load-env.mjs';
import { RAKUTEN_MERCHANT_MIDS } from '../lib/feed-sync/rakuten-merchants.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
loadProjectEnv(root);
armLiveIngest();

process.env.RAKUTEN_FTP_DIR_FILTER =
  process.env.RAKUTEN_FTP_DIR_FILTER || RAKUTEN_MERCHANT_MIDS.join(',');
process.env.RAKUTEN_CHUNK_FILE_LIMIT = process.env.RAKUTEN_CHUNK_FILE_LIMIT || '32';

const { syncRakutenFeeds, refreshCatalogMaterializedViews } = await import(
  pathToFileURL(path.join(root, 'lib/feed-sync/rakuten-sync.js')).href
);

console.log('INTERTEXE — ingest all Rakuten merchants');
console.log(`MIDs (${RAKUTEN_MERCHANT_MIDS.length}): ${RAKUTEN_MERCHANT_MIDS.join(', ')}`);
console.log(`File limit: ${process.env.RAKUTEN_CHUNK_FILE_LIMIT}\n`);

const filterMids =
  process.env.RAKUTEN_FTP_DIR_FILTER?.split(',').map((s) => s.trim()).filter(Boolean) ||
  RAKUTEN_MERCHANT_MIDS;

const result = await syncRakutenFeeds({
  ftpDirFilter: filterMids,
  fileLimit: Number(process.env.RAKUTEN_CHUNK_FILE_LIMIT || 32),
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

console.log('\nNext: run dedicated ingests for best coverage:');
console.log('  node scripts/ingest-mytheresa-rakuten.cjs');
console.log('  node scripts/ingest-bloomingdales.mjs');
console.log('  node scripts/ingest-marketplace-50745.cjs');
console.log('  node scripts/ingest-fleur-du-mal.cjs');
