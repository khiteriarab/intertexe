#!/usr/bin/env node
/**
 * Id-walk NFP repair via PostgREST — triggers re-derive on each fixed row.
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq);
    if (process.env[key]) continue;
    let val = trimmed.slice(eq + 1);
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

const root = process.cwd();
loadEnvFile(path.join(root, ".env.development.local"));
loadEnvFile(path.join(root, ".env.local"));
loadEnvFile(path.join(root, "../.env"));

import { assertCatalogBulkMutationsAllowed } from "./lib/catalog-bulk-guard.mjs";
assertCatalogBulkMutationsAllowed();

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const scanLimit = Number(process.argv[2] || 1200);
const fixLimit = Number(process.argv[3] || 600);
const maxSteps = Number(process.argv[4] || 8000);
const cursorFile = path.join(root, "scripts/nfp-id-walk.cursor.json");

if (!url || !key) {
  console.error("Need SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(url, key);
const zeroUuid = "00000000-0000-0000-0000-000000000000";

function readCursor() {
  try {
    return JSON.parse(fs.readFileSync(cursorFile, "utf8")).afterId || zeroUuid;
  } catch {
    return zeroUuid;
  }
}

function writeCursor(afterId, totalFixed, emptyPasses) {
  fs.writeFileSync(
    cursorFile,
    JSON.stringify({ afterId, totalFixed, emptyPasses, updatedAt: new Date().toISOString() }, null, 2)
  );
}

let afterId = readCursor();
let totalFixed = 0;
let emptyPasses = 0;

console.log(`NFP id-walk RPC scan=${scanLimit} fix=${fixLimit} maxSteps=${maxSteps}`);

for (let step = 1; step <= maxSteps; step++) {
  const { data, error } = await sb.rpc("fix_synthetic_nfp_mismatch_id_batch", {
    p_after_id: afterId,
    p_scan_limit: scanLimit,
    p_fix_limit: fixLimit,
  });

  if (error) {
    console.error(`step ${step} FAILED:`, error.message);
    process.exit(1);
  }

  const row = Array.isArray(data) ? data[0] : data;
  const fixed = Number(row?.rows_updated ?? 0);
  const lastId = String(row?.last_scanned_id ?? afterId);
  totalFixed += fixed;

  if (step % 10 === 0 || fixed > 0 || step <= 3) {
    console.log(`step ${step}: fixed=${fixed} totalFixed=${totalFixed} cursor=${lastId.slice(0, 8)}…`);
  }

  writeCursor(lastId, totalFixed, emptyPasses);

  if (lastId === afterId) {
    emptyPasses += 1;
    if (emptyPasses >= 2) {
      const { data: rem } = await sb.rpc("count_synthetic_nfp_mismatch");
      const remaining = Number(rem ?? 0);
      console.log(`DONE emptyPasses=${emptyPasses} remaining=${remaining} totalFixed=${totalFixed}`);
      process.exit(remaining === 0 ? 0 : 1);
    }
    afterId = zeroUuid;
    continue;
  }

  emptyPasses = 0;
  afterId = lastId;

  if (step % 50 === 0) {
    const { data: rem } = await sb.rpc("count_synthetic_nfp_mismatch");
    console.log(`checkpoint remaining=${rem} totalFixed=${totalFixed}`);
  }
}

console.log(`STOP maxSteps totalFixed=${totalFixed}`);
