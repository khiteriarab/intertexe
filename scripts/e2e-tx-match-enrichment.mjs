#!/usr/bin/env node
/**
 * Production E2E for durable enrichment + TX Match.
 *
 * Test A: easy JSON-LD retailer (OpenAI should be skipped)
 * Test B: incomplete / blocked extraction path (OpenAI fallback when needed)
 *
 * Updates external_captures only — never products / live_products.
 *
 *   cd intertexe-website && node --import tsx scripts/e2e-tx-match-enrichment.mjs
 */
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

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

const {
  enrichFromUrl,
  enrichmentIsSufficient,
  materialStatusFromCompositionProvenance,
  mergeEnrichment,
  pageTextSnippetFromHtml,
  enrichmentToAttributes,
} = await import("../lib/capture-enrichment.ts");
const { enrichGapsWithOpenAI } = await import("../lib/capture-enrichment-ai.ts");
const { findBetterAlternatives, findBetterInputFromEnrichment } = await import(
  "../lib/capture-find-better.ts"
);
const { fetchPageHTML } = await import("../lib/scanner/retailer-extraction.ts");

const EASY_URL =
  process.env.EASY_URL ||
  "https://www.madewell.com/the-perfect-vintage-jean-in-cali-blue-wash-NJ794.html";
const HARD_URL =
  process.env.HARD_URL ||
  "https://www.everlane.com/products/womens-the-way-high-jean-medium-indigo";

function urlHash(u) {
  return createHash("sha256").update(u).digest("hex");
}

async function pickUserId() {
  const { data } = await sb
    .from("external_captures")
    .select("user_id")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.user_id || "e2e-tx-match";
}

async function assertNeverExisted(pageUrl) {
  const { data } = await sb
    .from("external_captures")
    .select("id")
    .eq("url_hash", urlHash(pageUrl))
    .limit(1);
  if (data?.length) {
    // Soft-delete uniqueness by using a unique canonical with cache-buster query for insert only
    return false;
  }
  return true;
}

async function runCase(label, pageUrl, { expectAiSkipped }) {
  console.log(`\n========== ${label} ==========`);
  console.log("url:", pageUrl);
  const t0 = Date.now();

  const enrichment0 = await enrichFromUrl(pageUrl);
  const detMs = Date.now() - t0;
  const sufficient = enrichmentIsSufficient(enrichment0);
  console.log("deterministic_ms:", detMs);
  console.log("sufficient_without_ai:", sufficient);
  console.log("deterministic_title:", enrichment0.title);
  console.log("deterministic_category:", enrichment0.category);
  console.log("composition:", enrichment0.compositionText);
  console.log(
    "composition_provenance:",
    enrichment0.provenance?.compositionText || null
  );

  let enrichment = enrichment0;
  let aiUsed = false;
  let aiTokens = null;
  const tAi = Date.now();
  if (!sufficient) {
    let snippet = "";
    try {
      snippet = pageTextSnippetFromHtml((await fetchPageHTML(pageUrl)) || "");
    } catch {
      snippet = "";
    }
    const ai = await enrichGapsWithOpenAI({
      url: pageUrl,
      existing: enrichment,
      pageTextSnippet: snippet,
      imageUrl: enrichment.imageUrl,
    });
    console.log("ai_skipped:", ai.skipped, ai.reason || "");
    console.log("ai_ms:", Date.now() - tAi);
    console.log("ai_tokens:", ai.usage.totalTokens);
    if (!ai.skipped) {
      enrichment = mergeEnrichment(enrichment, ai.patch, ai.provenance);
      aiUsed = true;
      aiTokens = ai.usage.totalTokens;
    }
  } else {
    console.log("ai_skipped: true (sufficient structured data)");
  }

  if (expectAiSkipped && aiUsed) {
    console.error("FAIL: expected OpenAI to be skipped for easy retailer");
    process.exit(1);
  }
  if (!expectAiSkipped && !aiUsed && !enrichmentIsSufficient(enrichment)) {
    console.warn(
      "WARN: hard case still insufficient and AI did not fill — recording evidence"
    );
  }

  const materialStatus = materialStatusFromCompositionProvenance(
    enrichment.provenance,
    enrichment.compositionText
  );
  if (
    enrichment.compositionText &&
    materialStatus === "verified" &&
    enrichment.provenance?.compositionText?.source === "heuristics"
  ) {
    console.error("FAIL: inferred composition marked verified");
    process.exit(1);
  }
  console.log("material_status:", materialStatus);

  const fbInput = findBetterInputFromEnrichment(enrichment, {});
  const tMatch = Date.now();
  const alternatives = await findBetterAlternatives(sb, fbInput);
  console.log("tx_match_ms:", Date.now() - tMatch);
  console.log("tx_matches:", alternatives.length);
  for (const [i, a] of alternatives.slice(0, 5).entries()) {
    console.log(
      `  ${i + 1}. ${a.brand_name || "?"} — ${a.name} | ${a.price} ${a.currency || ""} | ${a.why}`
    );
  }

  const userId = await pickUserId();
  const uniqueUrl = `${pageUrl}${pageUrl.includes("?") ? "&" : "?"}itx_e2e=${Date.now()}`;
  const insertRow = {
    user_id: userId,
    item_type: "captured_url",
    source_app: "api",
    original_url: pageUrl,
    canonical_url: uniqueUrl,
    url_hash: urlHash(uniqueUrl),
    title: "pending.e2e",
    retailer: enrichment.retailer,
    enrichment_status: "pending",
    resolution_status: "saved",
    material_status: "unknown",
    decode_requested: true,
  };
  const { data: inserted, error: insErr } = await sb
    .from("external_captures")
    .insert(insertRow)
    .select("*")
    .single();
  if (insErr) {
    console.error("insert failed:", insErr.message);
    process.exit(1);
  }
  console.log("saved_capture_id:", inserted.id, "immediate_title:", inserted.title);

  const patch = {
    title: enrichment.title,
    brand_name: enrichment.brand,
    retailer: enrichment.retailer,
    price: enrichment.price,
    currency: enrichment.currency,
    description: enrichment.description,
    composition_text: enrichment.compositionText,
    image_url: enrichment.imageUrl,
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
    material_status: materialStatus,
    material_confidence: enrichment.provenance?.compositionText?.source || null,
    enrichment_status: enrichmentIsSufficient(enrichment) ? "ready" : "needs_information",
    enrichment_attempt_count: 1,
    enrichment_locked_at: null,
    enrichment_ai_used: aiUsed,
    enrichment_ai_tokens: aiTokens,
    enrichment_ai_at: aiUsed ? new Date().toISOString() : null,
    enrichment_ai_model: aiUsed ? "gpt-4o-mini" : null,
    alternatives: alternatives.length ? alternatives : null,
    alternatives_ready_at: alternatives.length ? new Date().toISOString() : null,
    resolution_status: alternatives.length ? "alternatives_ready" : "analyzed",
    decoded_at: new Date().toISOString(),
    original_url: pageUrl,
  };
  const { error: upErr } = await sb
    .from("external_captures")
    .update(patch)
    .eq("id", inserted.id);
  if (upErr) {
    console.error("update failed:", upErr.message);
    process.exit(1);
  }

  const { data: reloaded } = await sb
    .from("external_captures")
    .select(
      "id,title,brand_name,price,image_url,category,composition_text,material_status,enrichment_status,enrichment_ai_used,resolution_status,alternatives,original_url"
    )
    .eq("id", inserted.id)
    .single();

  console.log("persisted:", {
    title: reloaded.title,
    brand: reloaded.brand_name,
    price: reloaded.price,
    has_image: Boolean(reloaded.image_url),
    category: reloaded.category,
    material_status: reloaded.material_status,
    enrichment_status: reloaded.enrichment_status,
    enrichment_ai_used: reloaded.enrichment_ai_used,
    resolution_status: reloaded.resolution_status,
    alts: Array.isArray(reloaded.alternatives) ? reloaded.alternatives.length : 0,
    original_url: reloaded.original_url,
  });
  console.log("total_ms:", Date.now() - t0);

  return {
    label,
    captureId: inserted.id,
    aiUsed,
    sufficient,
    alts: Array.isArray(reloaded.alternatives) ? reloaded.alternatives.length : 0,
    materialStatus: reloaded.material_status,
    title: reloaded.title,
  };
}

console.log("=== TX Match durable enrichment E2E ===");
await assertNeverExisted(EASY_URL + "?fresh=1");

const easy = await runCase("EASY_JSONLD", EASY_URL, { expectAiSkipped: true });
const hard = await runCase("HARD_FALLBACK", HARD_URL, { expectAiSkipped: false });

console.log("\n=== SUMMARY ===");
console.log(JSON.stringify({ easy, hard }, null, 2));
if (!easy.title || easy.title === "pending.e2e") {
  console.error("FAIL: easy case did not enrich title");
  process.exit(1);
}
console.log("OK");
