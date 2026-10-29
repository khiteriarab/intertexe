#!/usr/bin/env node
/**
 * One-shot: rewrite stored Rakuten offer links to cleaned /deeplink PDPs.
 * Fixes iOS Universal Links that open MyTheresa home instead of the product.
 *
 *   DRY_RUN=1 node scripts/backfill-retailer-clickout-urls.mjs
 *   node scripts/backfill-retailer-clickout-urls.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

for (const f of [".env.vercel.local", ".env.local", ".env"]) {
  try {
    for (const line of readFileSync(f, "utf8").split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // ignore
  }
}

const KNOWN_MIDS = [
  "52963", "52708", "50745", "50739", "49987", "49384", "46961", "43654", "43172",
  "42841", "42623", "41993", "39906", "37206", "36145", "35663", "13867",
].sort((a, b) => b.length - a.length);

const TRACKING = new Set([
  "feed_num", "feed_des", "feed_mwg", "dplink", "chn", "src", "cmp", "tarea",
  "pub_id", "pub_name", "pub_type", "ptyp", "utm_source", "utm_medium", "utm_campaign",
  "utm_content", "utm_term", "pid", "ranmid", "raneaid", "ransiteid", "partnerid", "cm_mmc",
]);

function improve(url, midHint) {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("linksynergy.com")) return null;
    let dest = parsed.searchParams.get("murl");
    if (!dest) return null;
    try { dest = decodeURIComponent(dest); } catch { /* keep */ }
    const destUrl = new URL(dest);
    if (!/mytheresa\.com|bloomingdales\./i.test(destUrl.hostname)) return null;
    for (const key of [...destUrl.searchParams.keys()]) {
      if (TRACKING.has(key.toLowerCase())) destUrl.searchParams.delete(key);
    }
    if (destUrl.hostname.includes("mytheresa.com") && ![...destUrl.searchParams.keys()].length) {
      destUrl.search = "";
    }
    const cleaned = destUrl.toString();
    let mid = String(midHint || parsed.searchParams.get("mid") || "").trim();
    if (!mid) {
      const afterDot = String(parsed.searchParams.get("offerid") || "").split(".")[1] || "";
      mid = KNOWN_MIDS.find((m) => afterDot.startsWith(m)) || "";
    }
    if (!mid) return null;
    const sid = parsed.searchParams.get("id") || "*8b0zWDyXo0";
    const next = `https://click.linksynergy.com/deeplink?id=${encodeURIComponent(sid)}&mid=${encodeURIComponent(mid)}&murl=${encodeURIComponent(cleaned)}`;
    return next === url ? null : next;
  } catch {
    return null;
  }
}

const dry = process.env.DRY_RUN === "1" || process.argv.includes("--dry-run");
const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });
const PAGE = 500;
let offset = 0;
let scanned = 0;
let updated = 0;

while (true) {
  const { data, error } = await sb
    .from("products")
    .select("id,url,retailer_mid")
    .ilike("url", "%linksynergy.com%")
    .range(offset, offset + PAGE - 1);
  if (error) throw error;
  if (!data?.length) break;
  offset += data.length;
  scanned += data.length;

  for (const row of data) {
    const next = improve(row.url, row.retailer_mid);
    if (!next) continue;
    updated += 1;
    if (dry) {
      if (updated <= 5) console.log("would update", row.id, "\n ", row.url, "\n→", next);
      continue;
    }
    const { error: upErr } = await sb.from("products").update({ url: next }).eq("id", row.id);
    if (upErr) console.error("update failed", row.id, upErr.message);
  }
  if (data.length < PAGE) break;
}

console.log(JSON.stringify({ dry, scanned, updated }, null, 2));
