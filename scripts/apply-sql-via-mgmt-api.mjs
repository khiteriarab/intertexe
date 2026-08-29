#!/usr/bin/env node
import { readFileSync } from "fs";
import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GUARD = path.join(__dirname, "guard-catalog-browse-speed.mjs");

const token = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = process.env.SUPABASE_PROJECT_REF || "burrylupizvggupsryuj";
const files = process.argv.slice(2);

if (!token || !files.length) {
  console.error("Usage: SUPABASE_ACCESS_TOKEN=... node apply-sql-via-mgmt-api.mjs <file.sql>...");
  process.exit(1);
}

// Block re-applying superseded slow browse migrations; validate any SQL that redefines browse RPCs.
const guard = spawnSync(process.execPath, [GUARD, ...files], { stdio: "inherit" });
if (guard.status !== 0) {
  console.error("Aborted: catalog browse speed guard failed.");
  process.exit(guard.status ?? 1);
}

for (const file of files) {
  const query = readFileSync(file, "utf8");
  console.log(`Applying ${file} (${query.length} bytes)...`);
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
    console.error(`FAILED ${file} HTTP ${res.status}:`, text.slice(0, 2000));
    process.exit(1);
  }
  console.log(`OK ${file}:`, text.slice(0, 200));
}
