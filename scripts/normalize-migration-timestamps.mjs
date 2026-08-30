#!/usr/bin/env node
/**
 * Give each supabase/migrations/*.sql file a unique version prefix.
 * Supabase tracks one row per version — duplicate YYYYMMDD prefixes break db push.
 *
 * Usage:
 *   node scripts/normalize-migration-timestamps.mjs          # dry run
 *   node scripts/normalize-migration-timestamps.mjs --apply  # rename files
 */
import { readdirSync, renameSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, "..", "supabase", "migrations");
const APPLY = process.argv.includes("--apply");

function parseMigration(filename) {
  const match = /^(\d+)_(.+)\.sql$/.exec(filename);
  if (!match) return null;
  return { filename, version: match[1], name: match[2] };
}

function nextTimestamp(base8, index) {
  // base8 = YYYYMMDD → append HHMMSS-style suffix for uniqueness (14 digits total)
  const hh = String(Math.floor(index / 3600)).padStart(2, "0");
  const mm = String(Math.floor((index % 3600) / 60)).padStart(2, "0");
  const ss = String(index % 60).padStart(2, "0");
  return `${base8}${hh}${mm}${ss}`;
}

const files = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith(".sql"))
  .map(parseMigration)
  .filter(Boolean)
  .sort((a, b) => a.filename.localeCompare(b.filename));

const byVersion = new Map();
for (const file of files) {
  if (!byVersion.has(file.version)) byVersion.set(file.version, []);
  byVersion.get(file.version).push(file);
}

const renames = [];
for (const [version, group] of byVersion) {
  if (group.length <= 1) continue;
  group.forEach((file, index) => {
    const newVersion =
      version.length >= 14 ? `${version.slice(0, 8)}${String(index).padStart(6, "0")}` : nextTimestamp(version.slice(0, 8), index + 1);
    const newFilename = `${newVersion}_${file.name}.sql`;
    if (newFilename !== file.filename) {
      renames.push({ from: file.filename, to: newFilename, oldVersion: version, newVersion });
    }
  });
}

if (!renames.length) {
  console.log("All migration timestamps are already unique.");
  process.exit(0);
}

console.log(`${APPLY ? "Applying" : "Planned"} ${renames.length} renames:\n`);
for (const { from, to } of renames) {
  console.log(`  ${from}\n    -> ${to}\n`);
}

if (!APPLY) {
  console.log("Dry run only. Re-run with --apply to rename files.");
  process.exit(0);
}

for (const { from, to } of renames) {
  renameSync(join(MIGRATIONS_DIR, from), join(MIGRATIONS_DIR, to));
}
console.log(`Renamed ${renames.length} migration files.`);
