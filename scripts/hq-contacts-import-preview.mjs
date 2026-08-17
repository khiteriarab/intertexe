#!/usr/bin/env node
/**
 * Emergency CSV preview for hq_contacts. Production uses hourly
 * /api/cron/hq-contacts-sheet-sync — do not export CSVs as the normal path.
 * Does not email anyone.
 *
 * Usage:
 *   node scripts/hq-contacts-import-preview.mjs customers.csv influencers.csv businesses.csv
 *   node scripts/hq-contacts-import-preview.mjs --apply customers.csv influencers.csv businesses.csv
 *
 * Tabs map to contact_type:
 *   *customer*      → customer
 *   *influencer*    → influencer
 *   *business*      → business
 *   *brand*         → brand
 *   *organization*  → organization (Partners tab also maps here; not Brand)
 *
 * Default is preview only. --apply writes after printing the preview.
 */
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { createClient } from "@supabase/supabase-js";
import path from "node:path";

const APPLY = process.argv.includes("--apply");
const files = process.argv.slice(2).filter((a) => a !== "--apply");

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function typeFromFile(file) {
  const base = path.basename(file).toLowerCase();
  if (base.includes("influencer") || base.includes("creator")) return "influencer";
  if (base.includes("brand")) return "brand";
  if (base.includes("organiz") || base.includes("organis") || base.includes("partner")) return "organization";
  if (base.includes("business")) return "business";
  return "customer";
}

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function col(map, row, names) {
  for (const n of names) {
    const idx = map[n];
    if (idx != null && row[idx]) return row[idx];
  }
  return "";
}

async function readCsv(file) {
  const rl = createInterface({ input: createReadStream(file), crlfDelay: Infinity });
  const rows = [];
  let headers = [];
  let map = {};
  for await (const line of rl) {
    if (!line.trim()) continue;
    const parts = parseCsvLine(line);
    if (!headers.length) {
      headers = parts.map((h) => h.toLowerCase().replace(/\s+/g, "_"));
      headers.forEach((h, i) => {
        map[h] = i;
      });
      continue;
    }
    rows.push(parts);
  }
  return { map, rows };
}

async function main() {
  if (!files.length) {
    console.error("Pass CSV paths for the three tabs (customers, influencers, businesses).");
    process.exit(1);
  }

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  const sb = createClient(url, key, { auth: { persistSession: false } });

  const { data: ws } = await sb.from("hq_workspaces").select("id").eq("slug", "intertexe").maybeSingle();
  if (!ws?.id) {
    console.error("intertexe workspace missing");
    process.exit(1);
  }

  const { data: existing, error: existingErr } = await sb
    .from("hq_contacts")
    .select("id, normalized_email, notes, outreach_status, user_id, contact_type")
    .eq("workspace_id", ws.id);
  if (existingErr) {
    console.error("hq_contacts not ready:", existingErr.message);
    console.error("Apply supabase/migrations/20260814_hq_contacts_outreach.sql in the SQL editor first.");
    process.exit(1);
  }
  const existingByEmail = new Map((existing || []).map((r) => [String(r.normalized_email), r]));

  const { data: prefs } = await sb.from("user_preferences").select("user_id, email");
  const usersByEmail = new Map(
    (prefs || [])
      .filter((p) => p.email)
      .map((p) => [normalizeEmail(p.email), p.user_id])
  );

  const seen = new Map();
  const preview = {
    insert: [],
    alreadyInSupabase: [],
    alreadyHasAccount: [],
    dupesInSheets: [],
    invalid: [],
  };

  for (const file of files) {
    const contactType = typeFromFile(file);
    const { map, rows } = await readCsv(file);
    for (const row of rows) {
      const email = normalizeEmail(
        col(map, row, ["email", "e-mail", "email_address", "mail"])
      );
      if (!email || !email.includes("@")) {
        preview.invalid.push({ file, reason: "missing_email" });
        continue;
      }
      const first = col(map, row, ["first_name", "firstname", "first"]);
      const last = col(map, row, ["last_name", "lastname", "last"]);
      const name = col(map, row, ["name", "full_name", "fullname"]) || [first, last].filter(Boolean).join(" ");
      const company = col(map, row, ["company", "company_name", "organization", "brand"]);
      const notes = col(map, row, ["notes", "note", "comments"]);
      const record = {
        email,
        normalized_email: email,
        first_name: first || null,
        last_name: last || null,
        full_name: name || null,
        name: name || null,
        company_name: company || null,
        contact_type: contactType,
        source: "google_sheet",
        sheet_tab: contactType,
        notes: notes || null,
        marketing_eligible: false,
        workspace_id: ws.id,
      };
      if (seen.has(email)) {
        preview.dupesInSheets.push({ email, keptType: seen.get(email), droppedType: contactType, file });
        continue;
      }
      seen.set(email, contactType);
      const already = existingByEmail.get(email);
      const userId = usersByEmail.get(email) || already?.user_id || null;
      if (already) {
        preview.alreadyInSupabase.push({
          email,
          existingType: already.contact_type,
          incomingType: contactType,
          hasAccount: Boolean(userId),
          status: already.outreach_status,
        });
        continue;
      }
      if (userId) {
        preview.alreadyHasAccount.push({ email, userId, contactType });
        record.user_id = userId;
        record.outreach_status = "converted";
      } else {
        record.outreach_status = "not_contacted";
      }
      preview.insert.push(record);
    }
  }

  console.log(
    JSON.stringify(
      {
        apply: APPLY,
        files,
        counts: {
          insert: preview.insert.length,
          alreadyInSupabase: preview.alreadyInSupabase.length,
          alreadyHasAccount: preview.alreadyHasAccount.length,
          dupesInSheets: preview.dupesInSheets.length,
          invalid: preview.invalid.length,
        },
        sampleInsert: preview.insert.slice(0, 8),
        alreadyInSupabase: preview.alreadyInSupabase.slice(0, 8),
        alreadyHasAccount: preview.alreadyHasAccount.slice(0, 8),
        dupesInSheets: preview.dupesInSheets.slice(0, 8),
      },
      null,
      2
    )
  );

  if (!APPLY) {
    console.log("\nPreview only. Re-run with --apply to write. Will not email anyone.");
    return;
  }

  let upserted = 0;
  for (const row of preview.insert) {
    const { data, error } = await sb.from("hq_contacts").insert(row).select("id, email").maybeSingle();
    if (error || !data?.id) {
      console.error("insert failed", row.email, error?.message);
      continue;
    }
    upserted += 1;
    await sb.from("hq_contact_outreach").insert({
      contact_id: data.id,
      email: row.email,
      channel: "system",
      direction: "system",
      provider: "import",
      event_type: "contact_imported",
      metadata: { sheet_tab: row.sheet_tab },
    });
  }

  await sb.rpc("hq_link_existing_users_to_contacts", { p_workspace_id: ws.id });
  console.log(JSON.stringify({ applied: true, attempted: preview.insert.length, upserted }));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
