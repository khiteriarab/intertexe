#!/usr/bin/env node
/**
 * Mark all local consumer migrations as applied on the linked remote project.
 * Use after manual SQL application left schema_migrations out of sync.
 *
 * Requires: SUPABASE_ACCESS_TOKEN, linked project (supabase link)
 *
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=... node scripts/repair-consumer-migration-history.mjs
 *   SUPABASE_ACCESS_TOKEN=... node scripts/repair-consumer-migration-history.mjs --dry-run
 */
import { readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const MIGRATIONS_DIR = join(ROOT, "supabase", "migrations");
const DRY_RUN = process.argv.includes("--dry-run");

function parseVersion(filename) {
  const match = /^(\d+)_.+\.sql$/.exec(filename);
  return match ? match[1] : null;
}

const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token && !DRY_RUN) {
  console.error("Set SUPABASE_ACCESS_TOKEN (Supabase dashboard → Account → Access Tokens).");
  process.exit(1);
}

const versions = [
  ...new Set(
    readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .map(parseVersion)
      .filter(Boolean)
  ),
].sort();

console.log(`Found ${versions.length} unique migration versions in supabase/migrations/`);

// Skip versions already on remote (20240016–20240020 from initial tracked push)
const alreadyTracked = new Set(["20240016", "20240018", "20240020"]);
const toRepair = versions.filter((v) => !alreadyTracked.has(v));

console.log(`Repairing ${toRepair.length} versions as applied (--status applied)...\n`);

let failed = 0;
for (const version of toRepair) {
  if (DRY_RUN) {
    console.log(`[dry-run] supabase migration repair --status applied ${version}`);
    continue;
  }
  const result = spawnSync(
    "npx",
    ["supabase", "migration", "repair", "--status", "applied", version, "--linked"],
    {
      cwd: ROOT,
      env: { ...process.env, SUPABASE_ACCESS_TOKEN: token },
      encoding: "utf8",
    }
  );
  const ok = result.status === 0;
  const line = (result.stdout || result.stderr || "").trim().split("\n").pop();
  console.log(`${ok ? "OK" : "FAIL"}\t${version}\t${line || ""}`);
  if (!ok) failed++;
}

if (failed) {
  console.error(`\n${failed} repair(s) failed.`);
  process.exit(1);
}

console.log("\nDone. Verify with: npx supabase migration list --linked");
console.log("Then: npx supabase db push --linked   (should report no pending migrations)");
