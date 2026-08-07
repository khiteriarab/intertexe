#!/usr/bin/env node
/**
 * Enrich Leset Rio Stirrup Pant capture and print Find Better matches.
 *
 * Never writes to products / live_products — only updates external_captures.
 * Requires migration 20260807_external_capture_enrichment.sql for full persist.
 *
 *   cd intertexe-website
 *   node --import tsx scripts/enrich-leset-capture.mjs
 */
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const CAPTURE_ID = "42feba02-ce84-4c73-8da5-3b8e6517fcbc";

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

console.log("=== Leset capture enrichment ===");
console.log("capture_id:", CAPTURE_ID);
console.log(
  "NOTE: This script updates external_captures only — never products/live_products."
);

const { data: capture, error: capErr } = await sb
  .from("external_captures")
  .select("*")
  .eq("id", CAPTURE_ID)
  .maybeSingle();

if (capErr || !capture) {
  console.error("Capture not found:", capErr?.message || CAPTURE_ID);
  process.exit(1);
}

const pageUrl = capture.canonical_url || capture.original_url;
if (!pageUrl) {
  console.error("Capture has no URL");
  process.exit(1);
}

console.log("url:", pageUrl);
console.log("fetching + enriching…");

const enrichment = await enrichFromUrl(pageUrl);
const fbInput = findBetterInputFromEnrichment(enrichment, {
  naturalFiberPercent: capture.natural_fiber_percent,
});
console.log("finding alternatives…");
const alternatives = await findBetterAlternatives(sb, fbInput);

const fullPatch = {
  title:
    !capture.title ||
    /^[a-z0-9.-]+\.(com|co|net|org|io|shop)/i.test(String(capture.title))
      ? enrichment.title || capture.title
      : capture.title || enrichment.title,
  brand_name:
    !capture.brand_name || String(capture.brand_name).toLowerCase() === "core"
      ? enrichment.brand || capture.brand_name
      : capture.brand_name || enrichment.brand,
  retailer: capture.retailer || enrichment.retailer,
  price: capture.price ?? enrichment.price,
  currency: capture.currency || enrichment.currency,
  description: capture.description || enrichment.description,
  composition_text:
    !capture.composition_text ||
    /%\s*off|shipping/i.test(String(capture.composition_text))
      ? enrichment.compositionText || capture.composition_text
      : capture.composition_text || enrichment.compositionText,
  image_url: capture.image_url || enrichment.imageUrl,
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
};

// Core columns that exist before enrichment migration
const corePatch = {
  title: fullPatch.title,
  brand_name: fullPatch.brand_name,
  retailer: fullPatch.retailer,
  price: fullPatch.price,
  currency: fullPatch.currency,
  description: fullPatch.description,
  composition_text: fullPatch.composition_text,
  image_url: fullPatch.image_url,
  alternatives: fullPatch.alternatives,
  alternatives_ready_at: fullPatch.alternatives_ready_at,
  resolution_status: fullPatch.resolution_status,
  decoded_at: fullPatch.decoded_at,
};

let persistMode = "full";
let { error: upErr } = await sb
  .from("external_captures")
  .update(fullPatch)
  .eq("id", CAPTURE_ID);

if (upErr && /column|schema cache/i.test(upErr.message)) {
  console.warn(
    "Enrichment columns missing — apply supabase/migrations/20260807_external_capture_enrichment.sql"
  );
  console.warn("Falling back to core external_captures columns only.");
  persistMode = "core";
  ({ error: upErr } = await sb
    .from("external_captures")
    .update(corePatch)
    .eq("id", CAPTURE_ID));
}

if (upErr) {
  console.error("Update failed:", upErr.message);
  console.log("\n(Printing extracted output anyway)\n");
} else {
  console.log("persisted:", persistMode, "→ external_captures only");
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
      description: enrichment.description?.slice?.(0, 160) || enrichment.description,
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

console.log("\nalternatives count:", alternatives.length);
console.log("--- Top 5 matches ---");
for (const [i, a] of alternatives.slice(0, 5).entries()) {
  console.log(
    `${i + 1}. ${a.brand_name || "?"} — ${a.name} | NFP ${a.natural_fiber_percent ?? "?"} | ${a.price ?? "?"} ${a.currency || ""} | ${a.why}`
  );
}

console.log(
  "\nOK: code path does not touch products table (updates external_captures only)."
);
console.log(
  "Category check: expected pants/trousers, got:",
  enrichment.category,
  "/",
  enrichment.subcategory
);
if (enrichment.category && /shoe/i.test(enrichment.category)) {
  console.error("FAIL: category must never be shoes for stirrup pant");
  process.exit(1);
}
if (!enrichment.category || !/pant|trouser/i.test(enrichment.category + " " + (enrichment.subcategory || ""))) {
  console.error("FAIL: expected pants/trousers category for Rio Stirrup Pant");
  process.exit(1);
}
if (upErr) process.exit(1);
