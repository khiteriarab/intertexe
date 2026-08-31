#!/usr/bin/env node
/**
 * Run fix_synthetic_nfp_mismatch_batch until 0 rows updated.
 *
 * Auth priority:
 *   1. DATABASE_URL — direct Postgres (recommended; avoids PostgREST timeouts)
 *   2. SUPABASE_ACCESS_TOKEN — Supabase Management API
 *   3. SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY — PostgREST RPC (often times out)
 *
 * Loads ../.env and .env when vars are missing (no shell export needed).
 *
 * Usage: node scripts/run-nfp-backfill.mjs [batchSize] [maxBatches]
 */
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

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
loadEnvFile(path.join(root, ".env"));
loadEnvFile(path.join(root, ".env.local"));
loadEnvFile(path.join(root, ".env.development.local"));
loadEnvFile(path.join(root, "../.env"));

const token = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = process.env.SUPABASE_PROJECT_REF || "burrylupizvggupsryuj";
const databaseUrl = process.env.DATABASE_URL;
const supabaseUrl = (process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL || "").replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const batchSize = Number(process.argv[2] || 2000);
const maxBatches = Number(process.argv[3] || 120);

if (!databaseUrl && !token && !(supabaseUrl && serviceKey)) {
  console.error("Need DATABASE_URL, SUPABASE_ACCESS_TOKEN, or SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

async function runQuery(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 500)}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Bad JSON: ${text.slice(0, 200)}`);
  }
}

async function runRpc(functionName, body = {}) {
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/${functionName}`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`RPC ${functionName} HTTP ${res.status}: ${text.slice(0, 500)}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function firstCell(rows, key) {
  if (typeof rows === "number") return rows;
  if (!Array.isArray(rows) || !rows.length) return 0;
  const row = rows[0];
  if (row && key in row) return Number(row[key]) || 0;
  if (typeof row === "number") return row;
  return 0;
}

let pgClient;
async function ensurePg() {
  if (!pgClient) {
    pgClient = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
    await pgClient.connect();
  }
  return pgClient;
}

async function pgQuery(sql, params = []) {
  const client = await ensurePg();
  const result = await client.query(sql, params);
  return result.rows;
}

async function fixBatch(limit) {
  if (token) {
    const batch = await runQuery(`SELECT public.fix_synthetic_nfp_mismatch_batch(${limit}) AS fixed;`);
    return firstCell(batch, "fixed");
  }
  if (databaseUrl) {
    const rows = await pgQuery("SELECT public.fix_synthetic_nfp_mismatch_batch($1) AS fixed", [limit]);
    return firstCell(rows, "fixed");
  }
  const result = await runRpc("fix_synthetic_nfp_mismatch_batch", { p_limit: limit });
  return typeof result === "number" ? result : Number(result) || 0;
}

async function countRemaining() {
  if (token) {
    const count = await runQuery(`SELECT public.count_synthetic_nfp_mismatch() AS remaining;`);
    return firstCell(count, "remaining");
  }
  if (databaseUrl) {
    const rows = await pgQuery("SELECT public.count_synthetic_nfp_mismatch() AS remaining");
    return firstCell(rows, "remaining");
  }
  const result = await runRpc("count_synthetic_nfp_mismatch");
  return typeof result === "number" ? result : Number(result) || 0;
}

const mode = databaseUrl && token ? "management-api" : databaseUrl ? "postgres" : token ? "management-api" : "postgrest-rpc";
console.log(`NFP backfill mode=${mode} batchSize=${batchSize} maxBatches=${maxBatches}`);

let totalFixed = 0;

async function main() {
  try {
    for (let i = 1; i <= maxBatches; i++) {
      let fixed = 0;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          fixed = await fixBatch(batchSize);
          break;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(`batch ${i} attempt ${attempt} failed: ${msg.slice(0, 120)}`);
          if (attempt === 3) throw err;
          await new Promise((r) => setTimeout(r, 2000 * attempt));
        }
      }

      totalFixed += fixed;
      console.log(`batch ${i}: fixed=${fixed} totalFixed=${totalFixed}`);

      if (fixed === 0) {
        const remaining = await countRemaining();
        console.log(`DONE remaining=${remaining} totalFixed=${totalFixed}`);
        return;
      }

      await new Promise((r) => setTimeout(r, 300));
    }

    const remaining = await countRemaining();
    console.log(`STOP (max batches) remaining=${remaining} totalFixed=${totalFixed}`);
  } finally {
    if (pgClient) await pgClient.end().catch(() => {});
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
