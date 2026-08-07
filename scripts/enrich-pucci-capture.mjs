#!/usr/bin/env node
/**
 * Enrich Pucci Vivara Print Cotton Skirt capture and print TX Matches.
 * Updates external_captures only — never products / live_products.
 *
 *   cd intertexe-website
 *   node --import tsx scripts/enrich-pucci-capture.mjs
 */
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const CAPTURE_ID = process.env.CAPTURE_ID || "d83245cf-b4e7-4a0b-aab4-843018a007e0";
const PUCCI_URL =
  process.env.PUCCI_URL ||
  "https://www.pucci.com/en-us/products/vivara-print-cotton-skirt-6hrw316h844021";

function loadEnv() {
  for (const f of [
    path.join(root, ".env"),
    path.join(root, ".env.local"),
    path.join(root, ".env.vercel.local"),
    path.join(root, "../.env"),
  ]) {
    if (!fs.existsSync(f)) continue;
    for (const line of fs.readFileSync(f, "utf8").split("\n")) {
      const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!m) continue;
      let v = m[2].trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (!process.env[m[1]]) process.env[m[1]] = v;
    }
  }
}

loadEnv();

const url = (
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  ""
)
  .replace(/^"|"$/g, "")
  .replace(/\/$/, "");
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").replace(/^"|"$/g, "");

if (!url || !key) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

const { enrichFromUrl, enrichmentToAttributes } = await import(
  "../lib/capture-enrichment.ts"
);
const { findBetterAlternatives, findBetterInputFromEnrichment } = await import(
  "../lib/capture-find-better.ts"
);

console.log("=== Pucci capture enrichment (TX Match E2E) ===");
console.log("capture_id:", CAPTURE_ID);

let { data: capture, error: capErr } = await sb
  .from("external_captures")
  .select("*")
  .eq("id", CAPTURE_ID)
  .maybeSingle();

if (capErr) {
  console.error("Lookup error:", capErr.message);
  process.exit(1);
}

if (!capture) {
  console.log("Capture missing — searching latest pucci rows…");
  const { data: rows } = await sb
    .from("external_captures")
    .select("*")
    .or("original_url.ilike.%pucci%,canonical_url.ilike.%pucci%,title.ilike.%pucci%")
    .order("created_at", { ascending: false })
    .limit(5);
  console.log(
    "candidates:",
    (rows || []).map((r) => ({
      id: r.id,
      title: r.title,
      enrichment_status: r.enrichment_status,
      url: r.canonical_url || r.original_url,
    }))
  );
  capture = rows?.[0] || null;
}

const pageUrl = capture?.canonical_url || capture?.original_url || PUCCI_URL;
console.log("url:", pageUrl);
console.log("before:", {
  title: capture?.title,
  image_url: capture?.image_url,
  enrichment_status: capture?.enrichment_status,
  resolution_status: capture?.resolution_status,
  price: capture?.price,
});

console.log("fetching + enriching…");
const t0 = Date.now();
const enrichment = await enrichFromUrl(pageUrl);
console.log("enrich_ms:", Date.now() - t0);

const fbInput = findBetterInputFromEnrichment(enrichment, {
  naturalFiberPercent: capture?.natural_fiber_percent ?? null,
});
console.log("finding TX Matches…");
const alternatives = await findBetterAlternatives(sb, fbInput);

const fullPatch = {
  title:
    !capture?.title ||
    /^[a-z0-9.-]+\.(com|co|net|org|io|shop)/i.test(String(capture.title))
      ? enrichment.title || capture?.title
      : capture?.title || enrichment.title,
  brand_name:
    !capture?.brand_name || String(capture.brand_name).toLowerCase() === "core"
      ? enrichment.brand || capture?.brand_name
      : capture?.brand_name || enrichment.brand,
  retailer: capture?.retailer || enrichment.retailer,
  price: capture?.price ?? enrichment.price,
  currency: capture?.currency || enrichment.currency,
  description: capture?.description || enrichment.description,
  composition_text:
    !capture?.composition_text ||
    /%\s*off|shipping/i.test(String(capture.composition_text))
      ? enrichment.compositionText || capture?.composition_text
      : capture?.composition_text || enrichment.compositionText,
  image_url: capture?.image_url || enrichment.imageUrl,
  category: enrichment.category,
  subcategory: enrichment.subcategory,
  color: enrichment.color,
  pattern: enrichment.pattern,
  silhouette: enrichment.silhouette,
  fit: enrichment.fit,
  length: enrichment.length,
  distinctive_details: enrichment.distinctiveDetails,
  attributes: enrichmentToAttributes(enrichment),
  match_brief: enrichment.matchBrief,
  provenance: enrichment.provenance,
  enrichment_status: "ready",
  alternatives: alternatives.length ? alternatives : null,
  alternatives_ready_at: alternatives.length ? new Date().toISOString() : null,
  resolution_status: alternatives.length ? "alternatives_ready" : "analyzed",
  decoded_at: new Date().toISOString(),
  error_message: null,
};

if (capture?.id) {
  const { error: upErr } = await sb
    .from("external_captures")
    .update(fullPatch)
    .eq("id", capture.id);
  if (upErr) console.error("Update failed:", upErr.message);
  else console.log("persisted → external_captures", capture.id);
} else {
  console.log("No capture row to update — printing extract only");
}

console.log("\n--- Extracted attributes ---");
console.log(
  JSON.stringify(
    {
      title: enrichment.title,
      brand: enrichment.brand,
      retailer: enrichment.retailer,
      price: enrichment.price,
      currency: enrichment.currency,
      imageUrl: enrichment.imageUrl,
      category: enrichment.category,
      subcategory: enrichment.subcategory,
      color: enrichment.color,
      pattern: enrichment.pattern,
      silhouette: enrichment.silhouette,
      fit: enrichment.fit,
      length: enrichment.length,
      distinctiveDetails: enrichment.distinctiveDetails,
      compositionText: enrichment.compositionText,
      matchBrief: enrichment.matchBrief,
      provenance: enrichment.provenance,
    },
    null,
    2
  )
);

console.log("\nTX Matches count:", alternatives.length);
console.log("--- Top 8 TX Matches ---");
for (const [i, a] of alternatives.slice(0, 8).entries()) {
  console.log(
    `${i + 1}. ${a.brand_name || "?"} — ${a.name} | NFP ${a.natural_fiber_percent ?? "?"} | ${a.price ?? "?"} ${a.currency || ""} | ${a.why}`
  );
}

const ok =
  Boolean(enrichment.title) &&
  Boolean(enrichment.imageUrl) &&
  Boolean(enrichment.brand) &&
  enrichment.price != null &&
  Boolean(enrichment.category);
if (!ok) {
  console.error("\nFAIL: incomplete enrichment for Pucci URL");
  process.exit(1);
}
console.log("\nOK: Pucci enrichment attributes present; TX Match ran.");
