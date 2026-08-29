#!/usr/bin/env node
import { readFileSync } from "fs";

const token = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = process.env.SUPABASE_PROJECT_REF || "burrylupizvggupsryuj";
const files = process.argv.slice(2);

if (!token || !files.length) {
  console.error("Usage: SUPABASE_ACCESS_TOKEN=... node apply-sql-via-mgmt-api.mjs <file.sql>...");
  process.exit(1);
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
