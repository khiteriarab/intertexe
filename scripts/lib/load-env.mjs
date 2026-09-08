import fs from 'fs';
import path from 'path';

export function loadEnvFile(filePath) {
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

/** Load repo env files without clobbering shell/CLI overrides. */
export function loadProjectEnv(root = process.cwd()) {
  const production = loadEnvFile(path.join(root, '.env.production.local'));
  const fromFiles = {
    ...production,
    ...loadEnvFile(path.join(root, '.env.vercel.local')),
    ...loadEnvFile(path.join(root, '.env.local')),
  };
  const merged = { ...fromFiles, ...process.env };
  // Production FTP creds always win over truncated dev .env.local copies.
  if (production.RAKUTEN_FTP_PASSWORD) merged.RAKUTEN_FTP_PASSWORD = production.RAKUTEN_FTP_PASSWORD;
  if (production.RAKUTEN_FTP_USER) merged.RAKUTEN_FTP_USER = production.RAKUTEN_FTP_USER;
  if (production.RAKUTEN_FTP_USERNAME) merged.RAKUTEN_FTP_USERNAME = production.RAKUTEN_FTP_USERNAME;
  Object.assign(process.env, merged);
  return merged;
}

/** Dedicated ingest scripts must write live — ignore FEED_LIVE_INGEST_ENABLED=0 in local env. */
export function armLiveIngest() {
  process.env.FEED_LIVE_INGEST_ENABLED = '1';
}
