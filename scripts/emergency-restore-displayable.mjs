#!/usr/bin/env node
/**
 * Emergency restore after NFP id-walk mass-triggered is_displayable=false.
 * Requires SUPABASE_ACCESS_TOKEN (management API) with database query scope.
 *
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=sbp_... node scripts/emergency-restore-displayable.mjs
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

import { assertCatalogBulkMutationsAllowed } from "./lib/catalog-bulk-guard.mjs";
assertCatalogBulkMutationsAllowed();

const token = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = process.env.SUPABASE_PROJECT_REF || "burrylupizvggupsryuj";
const hotfixSql = fs.readFileSync(
  path.join(root, "supabase/migrations/20260831120000_hotfix_is_displayable_restore.sql"),
  "utf8"
);

if (!token) {
  console.error("Set SUPABASE_ACCESS_TOKEN (sbp_... from supabase.com/dashboard/account/tokens)");
  process.exit(1);
}

async function runSql(label, query) {
  console.log(`\n${label}...`);
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`FAILED (${res.status}):`, text.slice(0, 500));
    process.exit(1);
  }
  console.log("OK:", text.slice(0, 300));
}

await runSql("Apply trigger hotfix", hotfixSql);

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const sb = createClient(url, key);

let total = 0;
for (let round = 1; round <= 40; round++) {
  const { data, error } = await sb.rpc("restore_is_displayable_batch", { p_limit: 5000 });
  if (error) {
    console.error("restore batch error:", error.message);
    break;
  }
  const n = Number(data ?? 0);
  total += n;
  console.log(`restore round ${round}: fixed=${n} total=${total}`);
  if (n === 0) break;
  await new Promise((r) => setTimeout(r, 1500));
}

console.log(`\nDone. Restored is_displayable on ${total} rows.`);
