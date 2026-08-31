#!/usr/bin/env node
/**
 * Walk products by id and fix NFP mismatches — uses fix_synthetic_nfp_mismatch_id_batch (bounded, no full-table scan).
 */
import fs from "node:fs";
import path from "node:path";

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

const token = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = process.env.SUPABASE_PROJECT_REF || "burrylupizvggupsryuj";
const scanLimit = Number(process.argv[2] || 1200);
const fixLimit = Number(process.argv[3] || 600);
const maxSteps = Number(process.argv[4] || 5000);
const cursorFile = path.join(root, "scripts/nfp-id-walk.cursor.json");

if (!token) {
  console.error("Need SUPABASE_ACCESS_TOKEN");
  process.exit(1);
}

async function query(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 400)}`);
  return JSON.parse(text);
}

function readCursor() {
  try {
    const raw = JSON.parse(fs.readFileSync(cursorFile, "utf8"));
    return raw.afterId || "00000000-0000-0000-0000-000000000000";
  } catch {
    return "00000000-0000-0000-0000-000000000000";
  }
}

function writeCursor(afterId, totalFixed, pass) {
  fs.writeFileSync(
    cursorFile,
    JSON.stringify({ afterId, totalFixed, pass, updatedAt: new Date().toISOString() }, null, 2)
  );
}

let afterId = readCursor();
let totalFixed = 0;
let pass = 0;
const zeroUuid = "00000000-0000-0000-0000-000000000000";

console.log(`NFP id-walk scan=${scanLimit} fix=${fixLimit} maxSteps=${maxSteps} start=${afterId.slice(0, 8)}…`);

for (let step = 1; step <= maxSteps; step++) {
  let rows = [];
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      rows = await query(
        `SELECT rows_updated, last_scanned_id::text AS last_scanned_id
         FROM public.fix_synthetic_nfp_mismatch_id_batch('${afterId}'::uuid, ${scanLimit}, ${fixLimit});`
      );
      break;
    } catch (err) {
      console.warn(`step ${step} attempt ${attempt}: ${String(err.message).slice(0, 100)}`);
      if (attempt === 4) throw err;
      await new Promise((r) => setTimeout(r, 3000 * attempt));
    }
  }

  const row = rows[0] || {};
  const fixed = Number(row.rows_updated) || 0;
  const lastId = String(row.last_scanned_id || afterId);
  totalFixed += fixed;

  if (step % 5 === 0 || fixed > 0 || step <= 3) {
    console.log(`step ${step}: fixed=${fixed} totalFixed=${totalFixed} cursor=${lastId.slice(0, 8)}…`);
  }

  writeCursor(lastId, totalFixed, pass);

  // End of table — start next pass from top until a full pass fixes nothing.
  if (lastId === afterId) {
    if (fixed === 0) {
      pass += 1;
      if (pass >= 2) {
        const rem = await query("SELECT public.count_synthetic_nfp_mismatch() AS remaining;");
        const remaining = Number(rem[0]?.remaining) || 0;
        console.log(`END pass=${pass} remaining=${remaining} totalFixed=${totalFixed}`);
        if (remaining === 0) process.exit(0);
        afterId = zeroUuid;
        writeCursor(afterId, totalFixed, pass);
        if (pass >= 4) {
          console.log(`STOP after ${pass} zero-progress passes remaining=${remaining}`);
          process.exit(remaining === 0 ? 0 : 1);
        }
        continue;
      }
    }
    afterId = zeroUuid;
    continue;
  }

  afterId = lastId;

  if (step % 25 === 0) {
    try {
      const rem = await query("SELECT public.count_synthetic_nfp_mismatch() AS remaining;");
      console.log(`checkpoint step=${step} remaining=${rem[0]?.remaining} totalFixed=${totalFixed}`);
    } catch {
      /* count is slow — skip */
    }
  }

  await new Promise((r) => setTimeout(r, 150));
}

console.log(`STOP maxSteps totalFixed=${totalFixed}`);
