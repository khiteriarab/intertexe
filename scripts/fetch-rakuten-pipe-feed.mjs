#!/usr/bin/env node
/** Download Rakuten pipe-delimited feed (MID_*_mp.txt.gz) to /tmp/feed-{MID}.txt */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client } from 'basic-ftp';
import { gunzipSync } from 'zlib';
import { loadProjectEnv } from './lib/load-env.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
loadProjectEnv(root);

const mids = process.argv.slice(2);
if (!mids.length) {
  console.error('Usage: node scripts/fetch-rakuten-pipe-feed.mjs <MID> [MID...]');
  process.exit(1);
}

const host = process.env.RAKUTEN_FTP_HOST || 'aftp.linksynergy.com';
const user = process.env.RAKUTEN_FTP_USER || process.env.RAKUTEN_FTP_USERNAME || 'rkp_4668007';
const password = process.env.RAKUTEN_FTP_PASSWORD;
if (!password) {
  console.error('Missing RAKUTEN_FTP_PASSWORD');
  process.exit(1);
}

async function downloadMid(mid) {
  const outPath = `/tmp/feed-${mid}.txt`;
  const client = new Client(60000);
  client.ftp.ipFamily = 4;
  await client.access({ host, user, password, secure: false });

  const candidates = [
    `${mid}_4668007_mp.txt.gz`,
    `${mid}/${mid}_4668007_mp.txt.gz`,
    `${mid}_4668007_mp.txt`,
  ];

  for (const remote of candidates) {
    try {
      const chunks = [];
      const { Writable } = await import('stream');
      const sink = new Writable({
        write(chunk, _enc, cb) {
          chunks.push(chunk);
          cb();
        },
      });
      await client.downloadTo(sink, remote);
      const buf = Buffer.concat(chunks);
      const body = remote.endsWith('.gz') ? gunzipSync(buf) : buf;
      fs.writeFileSync(outPath, body);
      console.log(`OK ${mid}: ${remote} -> ${outPath} (${body.length} bytes)`);
      client.close();
      return true;
    } catch {
      /* try next path */
    }
  }

  client.close();
  console.warn(`FAIL ${mid}: no pipe feed found`);
  return false;
}

for (const mid of mids) {
  await downloadMid(mid);
}
