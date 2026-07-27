#!/usr/bin/env node
/**
 * Production regression: price-low order + composition presence on browse/PDP paths.
 *
 *   node --env-file=../.env scripts/qa-price-sort-composition.mjs
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/qa-price-sort-composition.mjs
 */
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function loadEnv() {
  for (const f of [
    path.join(root, "../.env"),
    path.join(root, ".env.vercel.local"),
    path.join(root, ".env.local"),
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

const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "")
  .replace(/^"|"$/g, "")
  .replace(/\/$/, "");
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").replace(/^"|"$/g, "");
if (!url || !key) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

function money(v) {
  const n = Number(String(v ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function rpcBrowse(extra = {}) {
  const { data, error } = await sb.rpc("catalog_browse_page_v2", {
    p_region: "us",
    p_category: "clothing",
    p_material_family: null,
    p_material_subtype: null,
    p_fabric_construction: null,
    p_min_nfp: null,
    p_max_synthetic: null,
    p_color: null,
    p_brand_slug: null,
    p_search: null,
    p_min_price: null,
    p_max_price: null,
    p_include_unverified: false,
    p_sort: "price_asc",
    p_limit: 24,
    p_offset: 0,
    ...extra,
  });
  if (error) throw error;
  return data;
}

async function main() {
  const failures = [];

  // 1) price_asc monotonic
  try {
    const data = await rpcBrowse();
    const products = data?.products || [];
    assert(products.length >= 8, `expected >=8 clothing products, got ${products.length}`);
    const prices = products.map((p) => money(p.price)).filter((n) => Number.isFinite(n));
    const sorted = [...prices].sort((a, b) => a - b);
    assert(
      JSON.stringify(prices) === JSON.stringify(sorted),
      `price_asc not sorted: ${prices.slice(0, 12).join(", ")}`
    );
    const pathMode = data?.debug?.path_mode;
    console.log("OK price_asc", { n: products.length, pathMode, first: prices.slice(0, 5) });
  } catch (e) {
    failures.push(`price_asc: ${e.message}`);
  }

  // 2) Peachy Den composition present in DB + fetchable
  try {
    const { data: rows, error } = await sb
      .from("products")
      .select("id,name,composition,natural_fiber_percent,is_displayable,region")
      .eq("brand_slug", "peachy-den")
      .ilike("name", "%Joan Soft Barrel%Indigo Rinse%")
      .limit(5);
    if (error) throw error;
    assert(rows?.length, "Peachy Den Joan Indigo Rinse not found");
    for (const row of rows) {
      assert(
        row.composition && String(row.composition).trim(),
        `blank composition on ${row.id}`
      );
      assert(
        /cotton/i.test(row.composition),
        `expected cotton composition on ${row.id}, got ${row.composition}`
      );
    }
    console.log("OK peachy composition", {
      n: rows.length,
      sample: rows[0].composition,
      displayable: rows[0].is_displayable,
    });
  } catch (e) {
    failures.push(`peachy: ${e.message}`);
  }

  // 3) No blank-composition rows on clothing page
  try {
    const data = await rpcBrowse({ p_limit: 40 });
    const blank = (data?.products || []).filter(
      (p) => !String(p.composition || "").trim()
    );
    assert(blank.length === 0, `${blank.length} clothing products missing composition`);
    console.log("OK clothing composition gate", { n: (data?.products || []).length });
  } catch (e) {
    failures.push(`composition_gate: ${e.message}`);
  }

  // 4) Feed checkpoint progress
  const { data: chunk } = await sb
    .from("system_status")
    .select("value_json,updated_at")
    .eq("key", "rakuten_feed_chunk_state")
    .maybeSingle();
  const v = chunk?.value_json || {};
  console.log("FEED checkpoint", {
    nextFileOffset: v.nextFileOffset,
    totalCatalogFiles: v.totalCatalogFiles,
    updatedAt: chunk?.updated_at,
  });

  if (failures.length) {
    console.error("FAIL\n" + failures.map((f) => `- ${f}`).join("\n"));
    process.exit(1);
  }
  console.log("ALL PASS");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
