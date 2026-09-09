#!/usr/bin/env node
/**
 * Targeted ingest for Rakuten MIDs that are thin/missing — skips already-OK merchants.
 *
 * Usage: FEED_LIVE_INGEST_ENABLED=1 node scripts/run-rakuten-gap-mids.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import { loadProjectEnv, armLiveIngest } from './lib/load-env.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
loadProjectEnv(root);
armLiveIngest();
process.env.SKIP_DESIGNER_REFRESH = '1';
process.env.RAKUTEN_CHUNK_FILE_LIMIT = process.env.RAKUTEN_CHUNK_FILE_LIMIT || '16';

const steps = [
  ['node', ['scripts/clear-catalog-kill-switches.mjs']],
  ['node', ['scripts/ingest-tory-burch.mjs']],
  ['node', ['scripts/ingest-isabel-marant.mjs']],
  ['node', ['scripts/ingest-fleur-du-mal.cjs']],
  ['node', ['scripts/ingest-faithfull.mjs']],
  ['node', ['scripts/fetch-rakuten-pipe-feed.mjs', '42841', '42623']],
  ['node', ['scripts/ingest-lagence.cjs']],
  ['node', ['scripts/ingest-splendid.cjs']],
  // 7fam needs /tmp/7fam-womens.json — covered by generic FTP for MID 36145
  // Generic FTP for Diesel, A.L.C., Peachy Den, Veronica Beard CA
  ['node', ['scripts/ingest-all-rakuten-merchants.mjs']],
  ['node', ['scripts/backfill-retailer-mid.mjs']],
  ['node', ['scripts/expedite-catalog-live.mjs']],
  ['node', ['scripts/probe-mid-shoppable.mjs']],
];

for (const [cmd, args] of steps) {
  const script = args[0];
  const full = path.join(root, script);
  if (!fs.existsSync(full)) {
    console.warn(`Skip missing ${script}`);
    continue;
  }
  console.log(`\n========== ${cmd} ${args.join(' ')} ==========\n`);
  const res = spawnSync(cmd, args, {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      FEED_LIVE_INGEST_ENABLED: '1',
      RAKUTEN_FTP_DIR_FILTER: '49384,41993,52708,52963,49987,43654,42841,42623,36145,46961,50739',
    },
  });
  if (res.status !== 0) console.warn(`Step exit ${res.status}: ${script}`);
}
