#!/usr/bin/env node
/** @deprecated Use scripts/ingest-bloomingdales.mjs (US 13867 + UK 37206). */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const script = path.join(path.dirname(fileURLToPath(import.meta.url)), "ingest-bloomingdales.mjs");
const result = spawnSync(process.execPath, [script, ...process.argv.slice(2)], {
  stdio: "inherit",
  env: process.env,
});
process.exit(result.status ?? 1);
