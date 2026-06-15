#!/usr/bin/env node
/**
 * Manual Rakuten / Mytheresa feed sync.
 *
 * Examples:
 *   node scripts/sync-rakuten-feed.js
 *   node scripts/sync-rakuten-feed.js --ftpDirFilter=43654
 *   node scripts/sync-rakuten-feed.js --ftpDirFilter=35663,43172,43654 --fileLimit=50
 */
import { syncRakutenFeeds } from '../lib/feed-sync/rakuten-sync.js';

function parseArgs(argv) {
  const options = {};
  for (const arg of argv) {
    if (arg.startsWith('--ftpDirFilter=')) {
      options.ftpDirFilter = arg.slice('--ftpDirFilter='.length).split(',').map((s) => s.trim()).filter(Boolean);
    } else if (arg.startsWith('--fileOffset=')) {
      options.fileOffset = Number(arg.slice('--fileOffset='.length));
    } else if (arg.startsWith('--fileLimit=')) {
      options.fileLimit = Number(arg.slice('--fileLimit='.length));
    } else if (arg === '--markInactive') {
      options.markInactive = true;
    }
  }
  return options;
}

const cli = parseArgs(process.argv.slice(2));

const result = await syncRakutenFeeds({
  fileOffset: cli.fileOffset ?? 0,
  fileLimit: cli.fileLimit ?? null,
  markInactive: cli.markInactive === true,
  ftpDirFilter: cli.ftpDirFilter,
});

console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
