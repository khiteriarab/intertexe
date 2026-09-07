#!/usr/bin/env node
/**
 * Targeted Bloomingdale's catalog ingest (US MID 13867 + UK MID 37206).
 *
 * Usage:
 *   node scripts/ingest-bloomingdales.mjs
 *   FEED_LIVE_INGEST_ENABLED=1 node scripts/ingest-bloomingdales.mjs
 *
 * Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RAKUTEN_FTP_* credentials.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BLOOMINGDALES_MIDS = ["13867", "37206"];

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\n/)) {
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

Object.assign(
  process.env,
  loadEnvFile(path.join(root, ".env")),
  loadEnvFile(path.join(root, ".env.local")),
  loadEnvFile(path.join(root, ".env.vercel.local"))
);

process.env.RAKUTEN_FTP_DIR_FILTER = BLOOMINGDALES_MIDS.join(",");
process.env.RAKUTEN_CHUNK_FILE_LIMIT = process.env.RAKUTEN_CHUNK_FILE_LIMIT || "8";
process.env.FEED_LIVE_INGEST_ENABLED = process.env.FEED_LIVE_INGEST_ENABLED || "1";

const { syncRakutenFeeds, refreshCatalogMaterializedViews } = await import(
  pathToFileURL(path.join(root, "lib/feed-sync/rakuten-sync.js")).href
);

console.log("INTERTEXE — Bloomingdale's ingest (US 13867 + UK 37206)");
console.log(`Started: ${new Date().toISOString()}`);
console.log(`FTP filter: ${process.env.RAKUTEN_FTP_DIR_FILTER}`);
console.log(`File limit: ${process.env.RAKUTEN_CHUNK_FILE_LIMIT}\n`);

const result = await syncRakutenFeeds({
  ftpDirFilter: BLOOMINGDALES_MIDS,
  fileLimit: Number(process.env.RAKUTEN_CHUNK_FILE_LIMIT || 8),
  forceLive: true,
  markInactive: false,
});

console.log("\nSync result:", JSON.stringify(result, null, 2));

if (String(process.env.CATALOG_MV_REFRESH_AFTER_SYNC || "1") === "1") {
  try {
    const refreshed = await refreshCatalogMaterializedViews();
    console.log("Refreshed materialized views:", refreshed.join(", ") || "(skipped)");
  } catch (err) {
    console.warn("[mv-refresh] failed:", err?.message || err);
  }
}

console.log(`Finished: ${new Date().toISOString()}`);
