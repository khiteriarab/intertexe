#!/usr/bin/env node
/**
 * Full Rakuten merchant reconcile:
 * 1. Clear kill switches + heal stuck checkpoint
 * 2. Audit all 16 MIDs
 * 3. Run generic + dedicated ingests for thin/missing merchants
 *
 * Usage:
 *   FEED_LIVE_INGEST_ENABLED=1 node scripts/reconcile-rakuten-merchants.mjs
 *   FEED_LIVE_INGEST_ENABLED=1 node scripts/reconcile-rakuten-merchants.mjs --audit-only
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import { createClient } from '@supabase/supabase-js';
import { loadProjectEnv, armLiveIngest } from './lib/load-env.mjs';
import { RAKUTEN_MERCHANTS } from '../lib/feed-sync/rakuten-merchants.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
loadProjectEnv(root);
armLiveIngest();

process.env.RAKUTEN_FTP_USER = process.env.RAKUTEN_FTP_USER || process.env.RAKUTEN_FTP_USERNAME || 'rkp_4668007';

const auditOnly = process.argv.includes('--audit-only');
const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function auditMids(sb) {
  const report = [];
  for (const def of RAKUTEN_MERCHANTS) {
    const mid = def.mid;
    const base = () => sb.from('products').select('*', { count: 'exact', head: true }).eq('retailer_mid', mid);
    const [{ count: total }, { count: live }] = await Promise.all([base(), base().eq('is_active', true)]);
    const status = (live || 0) >= 20 ? 'OK' : (total || 0) > 0 ? 'STALE' : 'MISSING';
    report.push({ status, mid, label: def.label, total: total || 0, live: live || 0 });
  }
  return report;
}

function runNode(script, extraEnv = {}) {
  console.log(`\n▶ ${script}`);
  const res = spawnSync('node', [path.join(root, script)], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, ...extraEnv, FEED_LIVE_INGEST_ENABLED: '1' },
  });
  return res.status === 0;
}

async function main() {
  if (!process.env.RAKUTEN_FTP_PASSWORD) {
    console.error('Missing RAKUTEN_FTP_PASSWORD');
    process.exit(1);
  }
  if (!url || !key) {
    console.error('Missing Supabase env');
    process.exit(1);
  }

  console.log('=== INTERTEXE Rakuten reconcile ===\n');

  runNode('scripts/clear-catalog-kill-switches.mjs');

  const probe = spawnSync('node', [path.join(root, 'scripts/probe-rakuten-ftp.mjs')], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  });
  if (probe.status !== 0) {
    console.error('FTP probe failed — check credentials/host');
    process.exit(1);
  }

  const sb = createClient(url, key, { auth: { persistSession: false } });
  const before = await auditMids(sb);
  console.log('\nBefore ingest:');
  console.table(before);

  if (auditOnly) return;

  const steps = [
    'scripts/ingest-mytheresa-rakuten.cjs --market=eu-uk-me,us-ca',
    'scripts/ingest-bloomingdales.mjs',
    'scripts/ingest-faithfull.mjs',
    'scripts/ingest-tory-burch.mjs',
    'scripts/ingest-isabel-marant.mjs',
    'scripts/ingest-fleur-du-mal.cjs',
    'scripts/ingest-marketplace-50745.cjs',
    'scripts/ingest-lagence.cjs',
    'scripts/ingest-splendid.cjs',
    'scripts/ingest-7fam.cjs',
  ];

  for (const step of steps) {
    const [script, ...args] = step.split(' ');
    const full = path.join(root, script);
    if (!fs.existsSync(full)) {
      console.warn(`Skip missing ${script}`);
      continue;
    }
    console.log(`\n▶ node ${step}`);
    spawnSync('node', [full, ...args], {
      cwd: root,
      stdio: 'inherit',
      env: { ...process.env, FEED_LIVE_INGEST_ENABLED: '1' },
    });
  }

  // Generic pass for all MIDs (brand programs without dedicated scripts).
  runNode('scripts/ingest-all-rakuten-merchants.mjs');

  runNode('scripts/backfill-retailer-mid.mjs');

  const after = await auditMids(sb);
  console.log('\nAfter ingest:');
  console.table(after);

  const stillBad = after.filter((r) => r.status !== 'OK');
  if (stillBad.length) {
    console.log(`\n${stillBad.length} MIDs still need attention:`, stillBad.map((r) => r.mid).join(', '));
    process.exitCode = 1;
  } else {
    console.log('\nAll 16 MIDs have live qualifying inventory.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
