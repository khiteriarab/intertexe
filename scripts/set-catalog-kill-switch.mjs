#!/usr/bin/env node
/**
 * Emergency catalog kill switch.
 *
 * Usage:
 *   node scripts/set-catalog-kill-switch.mjs block "incident reason"
 *   node scripts/set-catalog-kill-switch.mjs clear "incident cleared"
 */
import { createClient } from "@supabase/supabase-js";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { setCatalogKillSwitch } = require("../lib/feed-sync/ingest-guard.cjs");

const action = String(process.argv[2] || "").toLowerCase();
const reason = process.argv.slice(3).join(" ") || "manual";

if (!["block", "clear"].includes(action)) {
  console.error("Usage: node scripts/set-catalog-kill-switch.mjs block|clear [reason]");
  process.exit(1);
}

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const payload = await setCatalogKillSwitch(supabase, action === "block", reason);
console.log(JSON.stringify({ ok: true, action, payload }, null, 2));
