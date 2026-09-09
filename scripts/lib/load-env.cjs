const fs = require('fs');
const path = require('path');

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

/** Load repo env without clobbering shell overrides. */
function loadProjectEnv(root = path.resolve(__dirname, '..', '..')) {
  const production = loadEnvFile(path.join(root, '.env.production.local'));
  const fromFiles = {
    ...production,
    ...loadEnvFile(path.join(root, '.env.vercel.local')),
    ...loadEnvFile(path.join(root, '.env.local')),
  };
  const merged = { ...fromFiles, ...process.env };
  if (production.RAKUTEN_FTP_PASSWORD) merged.RAKUTEN_FTP_PASSWORD = production.RAKUTEN_FTP_PASSWORD;
  if (production.RAKUTEN_FTP_USER) merged.RAKUTEN_FTP_USER = production.RAKUTEN_FTP_USER;
  if (production.RAKUTEN_FTP_USERNAME) merged.RAKUTEN_FTP_USERNAME = production.RAKUTEN_FTP_USERNAME;
  Object.assign(process.env, merged);
  return merged;
}

function armLiveIngest() {
  process.env.FEED_LIVE_INGEST_ENABLED = '1';
}

module.exports = { loadEnvFile, loadProjectEnv, armLiveIngest };
