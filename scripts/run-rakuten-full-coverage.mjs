#!/usr/bin/env node
/**
 * Sequential Rakuten MID coverage — one ingest at a time to avoid DB overload.
 *
 * Usage: FEED_LIVE_INGEST_ENABLED=1 node scripts/run-rakuten-full-coverage.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import { loadProjectEnv, armLiveIngest } from './lib/load-env.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
loadProjectEnv(root);
armLiveIngest();
process.env.SKIP_DESIGNER_REFRESH = process.env.SKIP_DESIGNER_REFRESH || '1';

const steps = [
  ['node', ['scripts/clear-catalog-kill-switches.mjs']],
  ['node', ['scripts/ingest-mytheresa-rakuten.cjs', '--market=eu-uk-me,us-ca']],
  ['node', ['scripts/ingest-bloomingdales.mjs']],
  ['node', ['scripts/ingest-tory-burch.mjs']],
  ['node', ['scripts/ingest-isabel-marant.mjs']],
  ['node', ['scripts/ingest-fleur-du-mal.cjs']],
  ['node', ['scripts/ingest-faithfull.mjs']],
  ['node', ['scripts/ingest-marketplace-50745.cjs']],
  ['node', ['scripts/fetch-rakuten-pipe-feed.mjs', '42841', '42623']],
  ['node', ['scripts/ingest-lagence.cjs']],
  ['node', ['scripts/ingest-splendid.cjs']],
  ['node', ['scripts/ingest-7fam.cjs']],
  // Generic pass for brand MIDs without dedicated pipe scripts
  ['node', ['scripts/ingest-all-rakuten-merchants.mjs']],
  ['node', ['scripts/backfill-retailer-mid.mjs']],
  ['node', ['scripts/expedite-catalog-live.mjs']],
  ['node', ['scripts/probe-mid-shoppable.mjs']],
];

for (const [cmd, args] of steps) {
  const script = args[0];
  const full = path.join(root, script.replace(/^scripts\//, 'scripts/'));
  if (!fs.existsSync(full)) {
    console.warn(`Skip missing ${script}`);
    continue;
  }
  console.log(`\n========== ${cmd} ${args.join(' ')} ==========\n`);
  const res = spawnSync(cmd, args, {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, FEED_LIVE_INGEST_ENABLED: '1' },
  });
  if (res.status !== 0) {
    console.warn(`Step failed (${res.status}): ${script}`);
  }
}
