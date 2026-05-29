#!/usr/bin/env node
/** @see ../scripts/backfill-barcode-dpp.mjs in repo root — run from parent with --env-file=.env */
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const script = path.join(__dirname, "../../scripts/backfill-barcode-dpp.mjs");
const child = spawn(process.execPath, [script, ...process.argv.slice(2)], {
  stdio: "inherit",
  env: process.env,
});
child.on("exit", (code) => process.exit(code ?? 0));
