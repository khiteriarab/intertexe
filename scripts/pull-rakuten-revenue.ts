#!/usr/bin/env node
/**
 * Manual production Rakuten revenue pull (Reporting API preferred, FTP fallback).
 *
 * Usage:
 *   node --import tsx scripts/pull-rakuten-revenue.ts
 *   node --import tsx scripts/pull-rakuten-revenue.ts --dry-run
 *   node --import tsx scripts/pull-rakuten-revenue.ts --env=.env.production.local
 *
 * Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and either
 *   RAKUTEN_REPORTS_URL  or  RAKUTEN_REPORTS_TOKEN + RAKUTEN_REPORTS_KEY
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pullRakutenRevenueReports } from "../lib/dashboard/rakuten-revenue-ftp.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2];
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const envArg = args.find((a) => a.startsWith("--env="));
const envFile = envArg?.slice("--env=".length) || ".env.production.local";

loadEnvFile(path.join(root, envFile));
loadEnvFile(path.join(root, ".env.local"));
loadEnvFile(path.join(root, ".env.vercel.local"));

const hasReports =
  Boolean(process.env.RAKUTEN_REPORTS_URL?.trim()) ||
  (Boolean(process.env.RAKUTEN_REPORTS_TOKEN?.trim()) &&
    Boolean(process.env.RAKUTEN_REPORTS_KEY?.trim()));
const hasSupabase =
  Boolean(
    process.env.SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.VITE_SUPABASE_URL
  ) && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

console.log(
  JSON.stringify(
    {
      dryRun,
      envFile,
      hasSupabase,
      hasReports,
      lookbackDays: process.env.RAKUTEN_REPORTS_LOOKBACK_DAYS || "30",
    },
    null,
    2
  )
);

if (!hasSupabase) {
  console.error("Missing Supabase service credentials.");
  process.exit(1);
}
if (!hasReports && !dryRun) {
  console.error("Missing RAKUTEN_REPORTS_URL (or token+key). Set in env file or Vercel.");
  process.exit(1);
}

const result = await pullRakutenRevenueReports({ dryRun, maxFiles: 5 });
console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
