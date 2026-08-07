#!/usr/bin/env node
/**
 * Universal filter-integrity matrix — acceptance: 0 invalid after integrity.
 *
 * Covers category, material, NFP (via fiber→p_min_nfp), price, brand, color,
 * sale (sale_catalog_list), New In (homepage rail / just_in probe), sort,
 * pagination offsets 0/24/48.
 *
 *   node --import tsx scripts/filter-integrity-matrix.mjs
 *   node --import tsx scripts/filter-integrity-matrix.mjs --json=/tmp/matrix.json
 */
import { readFileSync, existsSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import {
  productViolatesFilters,
  filterProductsForIntegrity,
  integritySpecFromBrowseOpts,
  parseNumericPrice,
} from "../lib/catalog-filter-integrity.ts";
import { buildCatalogBrowseV2Params } from "../lib/catalog-browse-v2.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const websiteRoot = resolve(__dirname, "..");
const iosRoot = resolve(websiteRoot, "..");

function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const raw = readFileSync(path, "utf8");
  const env = {};
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const m = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m) continue;
    env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

const fileEnv = {
  ...loadEnvFile(resolve(iosRoot, ".env")),
  ...loadEnvFile(resolve(websiteRoot, ".env.vercel.local")),
  ...loadEnvFile(resolve(websiteRoot, ".env.local")),
  ...loadEnvFile(resolve(websiteRoot, ".env")),
};

const url =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  fileEnv.SUPABASE_URL ||
  fileEnv.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  fileEnv.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  fileEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Missing SUPABASE_URL / SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });
const LATENCY_WARN_MS = 15000;
const LATENCY_FAIL_MS = 25000;

function constraintsLabel(opts) {
  const parts = [];
  if (opts.category) parts.push(`category=${opts.category}`);
  if (opts.fiber) parts.push(`fiber=${opts.fiber}`);
  if (opts.minNfp != null) parts.push(`minNfp=${opts.minNfp}`);
  if (opts.maxPrice != null) parts.push(`maxPrice=${opts.maxPrice}`);
  if (opts.minPrice != null) parts.push(`minPrice=${opts.minPrice}`);
  if (opts.brand) parts.push(`brand=${opts.brand}`);
  if (opts.color) parts.push(`color=${opts.color}`);
  if (opts.sale === true) parts.push("sale=true");
  if (opts.justIn === true) parts.push("justIn=true");
  if (opts.sort) parts.push(`sort=${opts.sort}`);
  if (opts.apparelOnly === false) parts.push("apparelOnly=false");
  if (opts.source) parts.push(`source=${opts.source}`);
  return parts.join(", ") || "(none)";
}

function toIntegrityProduct(row) {
  return {
    id: String(row.id ?? ""),
    name: String(row.name ?? ""),
    category: String(row.category ?? ""),
    garment_type: row.garment_type != null ? String(row.garment_type) : null,
    brand_slug: row.brand_slug != null ? String(row.brand_slug) : null,
    brandSlug: row.brand_slug != null ? String(row.brand_slug) : null,
    price: row.price ?? row.price_numeric ?? null,
    composition: row.composition != null ? String(row.composition) : "",
    color: row.color != null ? String(row.color) : null,
    is_sale: row.is_sale === true,
    isSale: row.is_sale === true,
    just_in: row.just_in === true || row.is_new_in === true,
    shop_material_family:
      row.shop_material_family != null ? String(row.shop_material_family) : null,
    material_primary: row.material_primary != null ? String(row.material_primary) : null,
    material_subtype: row.material_subtype != null ? String(row.material_subtype) : null,
    fabric_construction:
      row.fabric_construction != null ? String(row.fabric_construction) : null,
    natural_fiber_percent:
      row.natural_fiber_percent != null ? Number(row.natural_fiber_percent) : null,
  };
}

async function callBrowse(opts) {
  const params = buildCatalogBrowseV2Params({
    region: "us",
    limit: opts.limit ?? 24,
    offset: opts.offset ?? 0,
    category: opts.category,
    fiber: opts.fiber,
    maxPrice: opts.maxPrice,
    minPrice: opts.minPrice,
    brand: opts.brand,
    color: opts.color,
    sort: opts.sort,
    apparelOnly: opts.apparelOnly !== false,
  });
  // Explicit min NFP override when testing standalone natural-fiber %
  if (opts.minNfp != null) {
    params.p_min_nfp = opts.minNfp;
  }
  const t0 = Date.now();
  const { data, error } = await sb.rpc("catalog_browse_page_v2", params);
  const ms = Date.now() - t0;
  if (error) throw new Error(error.message);
  const payload = data ?? {};
  const rows = Array.isArray(payload.products) ? payload.products : [];
  return { rows, ms, params, source: "catalog_browse_page_v2" };
}

async function callSaleCatalog(opts) {
  const t0 = Date.now();
  // Live signature: preferred/fallback region, fiber, max_price, limit, offset,
  // optional category / brand_slug / color.
  const { data, error } = await sb.rpc("sale_catalog_list", {
    p_preferred_region: "us",
    p_fallback_region: "us",
    p_fiber: opts.fiber || null,
    p_max_price: opts.maxPrice ?? null,
    p_limit: opts.limit ?? 24,
    p_offset: opts.offset ?? 0,
    p_category: opts.category || null,
    p_brand_slug: opts.brand || null,
    p_color: opts.color || null,
  });
  const ms = Date.now() - t0;
  if (error) throw new Error(`sale_catalog_list: ${error.message}`);
  const rows = Array.isArray(data) ? data : data?.products || [];
  return { rows, ms, params: { sale: true, ...opts }, source: "sale_catalog_list" };
}

async function callNewInProbe(opts) {
  const t0 = Date.now();
  let source = "homepage_feed_items:top:new_in";

  const { data: feed, error: feedErr } = await sb
    .from("homepage_feed_items")
    .select(
      "source_id, product_id, rank, name, brand_slug, brand_name, category, price, natural_fiber_percent, is_sale, image_url"
    )
    .eq("rail_key", "top:new_in")
    .order("rank", { ascending: true })
    .range(opts.offset ?? 0, (opts.offset ?? 0) + (opts.limit ?? 24) - 1);

  if (feedErr) throw new Error(`new_in feed: ${feedErr.message}`);
  const items = feed || [];
  if (!items.length) {
    return { rows: [], ms: Date.now() - t0, params: opts, source: "homepage_feed_items:empty" };
  }

  // Prefer UUID source_id join; fallback to retailer product_id text key.
  const sourceIds = items.map((r) => r.source_id).filter(Boolean);
  let bySource = new Map();
  if (sourceIds.length) {
    const { data, error } = await sb
      .from("products")
      .select(
        "id,name,category,garment_type,brand_slug,price,composition,color,is_sale,shop_material_family,natural_fiber_percent"
      )
      .in("id", sourceIds);
    if (error) throw new Error(`new_in products: ${error.message}`);
    bySource = new Map((data || []).map((p) => [p.id, p]));
  }

  const rows = items.map((item) => {
    const full = bySource.get(item.source_id);
    if (full) {
      return { ...full, just_in: true, is_new_in: true };
    }
    // Denormalized rail row — still a valid New In product for integrity.
    return {
      id: item.source_id || item.product_id,
      name: item.name,
      category: item.category,
      brand_slug: item.brand_slug,
      price: item.price,
      composition: "",
      is_sale: item.is_sale === true,
      natural_fiber_percent: item.natural_fiber_percent,
      just_in: true,
      is_new_in: true,
    };
  });

  const ms = Date.now() - t0;
  return { rows, ms, params: opts, source };
}

function countViolations(products, spec) {
  const violations = [];
  for (const p of products) {
    const reason = productViolatesFilters(p, spec);
    if (reason) violations.push({ id: p.id, name: p.name, reason });
    // Extra: explicit min NFP when requested
    if (spec.minNfp != null && reason == null) {
      const nfp = p.natural_fiber_percent;
      if (nfp == null || Number(nfp) < spec.minNfp) {
        violations.push({
          id: p.id,
          name: p.name,
          reason: `nfp_below_min:${spec.minNfp}`,
        });
      }
    }
  }
  return violations;
}

function sortOrderOk(products, sort) {
  if (!sort || products.length < 2) return true;
  const prices = products.map((p) => parseNumericPrice(p.price)).filter((n) => n != null);
  if (prices.length < 2) return true;
  if (sort === "price_asc" || sort === "price-low") {
    for (let i = 1; i < prices.length; i++) {
      if (prices[i] < prices[i - 1] - 0.01) return false;
    }
  }
  if (sort === "price_desc" || sort === "price-high") {
    for (let i = 1; i < prices.length; i++) {
      if (prices[i] > prices[i - 1] + 0.01) return false;
    }
  }
  return true;
}

async function pickBrand(category) {
  const { rows } = await callBrowse({ category, limit: 24, offset: 0 });
  return rows.map((r) => String(r.brand_slug || "").toLowerCase()).find(Boolean) || null;
}

async function main() {
  const jsonOut = process.argv.find((a) => a.startsWith("--json="))?.slice(7);

  const dressBrand = await pickBrand("dresses");
  const trouserBrand = await pickBrand("trousers");

  /** @type {{ name: string, opts: Record<string, unknown>, fetch?: string, offsets?: number[] }[]} */
  const combos = [
    // Categories
    { name: "jumpsuits", opts: { category: "jumpsuits" } },
    { name: "jumpsuits Under $200", opts: { category: "jumpsuits", maxPrice: 200 } },
    { name: "dresses", opts: { category: "dresses" } },
    { name: "dresses Silk Under $500", opts: { category: "dresses", fiber: "silk", maxPrice: 500 } },
    { name: "dresses Silk Under $300", opts: { category: "dresses", fiber: "silk", maxPrice: 300 } },
    { name: "trousers", opts: { category: "trousers" } },
    { name: "trousers Under $200", opts: { category: "trousers", maxPrice: 200 } },
    { name: "trousers Linen", opts: { category: "trousers", fiber: "linen" } },
    { name: "trousers Linen Under $300", opts: { category: "trousers", fiber: "linen", maxPrice: 300 } },
    { name: "tops", opts: { category: "tops" } },
    { name: "skirts Silk Under $400", opts: { category: "skirts", fiber: "silk", maxPrice: 400 } },
    { name: "shoes", opts: { category: "shoes", apparelOnly: false } },
    { name: "shoes Leather Under $300", opts: { category: "shoes", fiber: "leather", maxPrice: 300, apparelOnly: false } },
    { name: "bags", opts: { category: "bags", apparelOnly: false } },
    { name: "knitwear", opts: { category: "knitwear" } },
    { name: "outerwear", opts: { category: "outerwear" } },
    { name: "shorts", opts: { category: "shorts" } },

    // Materials / NFP
    { name: "Cashmere (apparel)", opts: { category: "clothing", fiber: "cashmere", apparelOnly: true } },
    { name: "Cotton (apparel)", opts: { category: "clothing", fiber: "cotton", apparelOnly: true } },
    { name: "Wool (apparel)", opts: { category: "clothing", fiber: "wool", apparelOnly: true } },
    { name: "Silk (apparel)", opts: { category: "clothing", fiber: "silk", apparelOnly: true } },
    { name: "Linen (apparel)", opts: { category: "clothing", fiber: "linen", apparelOnly: true } },
    { name: "minNfp 90 clothing", opts: { category: "clothing", minNfp: 90, apparelOnly: true } },
    { name: "minNfp 100 clothing", opts: { category: "clothing", minNfp: 100, apparelOnly: true } },

    // Color + price + material
    { name: "dresses black Under $400", opts: { category: "dresses", color: "black", maxPrice: 400 } },
    { name: "tops cotton white Under $250", opts: { category: "tops", fiber: "cotton", color: "white", maxPrice: 250 } },

    // Designer / brand
    {
      name: dressBrand ? `dresses brand ${dressBrand}` : "dresses brand skipped",
      opts: dressBrand
        ? { category: "dresses", brand: dressBrand, maxPrice: 800 }
        : { category: "dresses", maxPrice: 800 },
    },
    {
      name: trouserBrand ? `trousers brand ${trouserBrand} Linen` : "trousers brand skipped",
      opts: trouserBrand
        ? { category: "trousers", brand: trouserBrand, fiber: "linen" }
        : { category: "trousers", fiber: "linen" },
    },

    // Price bands
    { name: "clothing minPrice 100 maxPrice 200", opts: { category: "clothing", minPrice: 100, maxPrice: 200 } },
    { name: "dresses minPrice 50 maxPrice 150", opts: { category: "dresses", minPrice: 50, maxPrice: 150 } },

    // Sort
    { name: "trousers sort price_asc", opts: { category: "trousers", sort: "price_asc", maxPrice: 400 } },
    { name: "trousers sort price_desc", opts: { category: "trousers", sort: "price_desc", maxPrice: 400 } },
    { name: "dresses sort most_natural", opts: { category: "dresses", sort: "most_natural", fiber: "silk" } },
    { name: "clothing sort newest", opts: { category: "clothing", sort: "newest" } },

    // Sale via dedicated RPC (hard constraint path)
    {
      name: "sale dresses Under $300",
      opts: { category: "dresses", maxPrice: 300, sale: true, source: "sale_catalog_list" },
      fetch: "sale",
    },
    {
      name: "sale trousers",
      opts: { category: "trousers", sale: true, source: "sale_catalog_list" },
      fetch: "sale",
    },
    {
      name: "sale trousers linen",
      opts: { category: "trousers", fiber: "linen", sale: true, source: "sale_catalog_list" },
      fetch: "sale",
    },
    {
      name: "sale dresses Under $500",
      opts: { category: "dresses", maxPrice: 500, sale: true, source: "sale_catalog_list" },
      fetch: "sale",
    },

    // New In
    {
      name: "New In rail",
      opts: { justIn: true, source: "new_in", apparelOnly: true },
      fetch: "new_in",
      offsets: [0, 24],
    },
    {
      name: "Cashmere + New In (integrity on rail)",
      opts: { fiber: "cashmere", justIn: true, category: "clothing", apparelOnly: true },
      fetch: "new_in",
      offsets: [0],
    },

    // Multi-filter stress
    {
      name: "dresses silk black Under $500",
      opts: { category: "dresses", fiber: "silk", color: "black", maxPrice: 500 },
    },
    {
      name: "trousers linen color beige",
      opts: { category: "trousers", fiber: "linen", color: "beige" },
    },
  ];

  const defaultOffsets = [0, 24, 48];
  const results = [];
  let anyFail = false;
  let latencyWarns = 0;

  console.log(
    "| combination | constraints | offset | count | invalid_raw | invalid_after | latency_ms | sort_ok | result |"
  );
  console.log("|---|---|---:|---:|---:|---:|---:|---|---|");

  for (const combo of combos) {
    const offsets = combo.offsets || defaultOffsets;
    for (const offset of offsets) {
      const label = `${combo.name} @${offset}`;
      try {
        let fetchResult;
        if (combo.fetch === "sale") {
          fetchResult = await callSaleCatalog({ ...combo.opts, limit: 24, offset });
        } else if (combo.fetch === "new_in") {
          fetchResult = await callNewInProbe({ ...combo.opts, limit: 24, offset });
        } else {
          fetchResult = await callBrowse({ ...combo.opts, limit: 24, offset });
        }

        const { rows, ms, source } = fetchResult;
        const spec = {
          ...integritySpecFromBrowseOpts(combo.opts),
          minNfp: combo.opts.minNfp ?? null,
        };
        // Sale path: force sale hard constraint
        if (combo.opts.sale === true) spec.sale = true;
        if (combo.opts.justIn === true) spec.justIn = true;

        const products = rows.map(toIntegrityProduct);
        const rawViolations = countViolations(products, spec);
        const after = filterProductsForIntegrity(products, spec).filter((p) => {
          if (spec.minNfp == null) return true;
          const nfp = p.natural_fiber_percent;
          return nfp != null && Number(nfp) >= spec.minNfp;
        });
        const afterViolations = countViolations(after, {
          ...spec,
          // after already NFP-filtered
          minNfp: null,
        });

        const sortOk = sortOrderOk(after, combo.opts.sort);
        let pass = afterViolations.length === 0 && sortOk;
        let result = pass ? "PASS" : "FAIL";
        let note = "";

        if (ms > LATENCY_FAIL_MS) {
          pass = false;
          result = "FAIL";
          note = "timeout_latency";
        } else if (ms > LATENCY_WARN_MS) {
          latencyWarns += 1;
          note = "slow";
        }

        // Sale inventory is known non-empty on page 1 — empty later pages are pagination end.
        if (combo.fetch === "sale" && after.length === 0 && offset === 0 && !note) {
          note = "sale_empty";
          result = "FAIL";
          pass = false;
        }

        // New In rail must return rows on offset 0 (rail has items in DB).
        if (combo.fetch === "new_in" && offset === 0 && after.length === 0 && !combo.opts.fiber) {
          note = (note ? note + ";" : "") + "new_in_empty";
          result = "FAIL";
          pass = false;
        }

        if (!pass) anyFail = true;
        if (result === "INCOMPLETE") anyFail = true;

        const row = {
          combination: combo.name,
          constraints: constraintsLabel({ ...combo.opts, source }),
          offset,
          count: after.length,
          invalid_raw: rawViolations.length,
          invalid_after: afterViolations.length,
          latency_ms: ms,
          sort_ok: sortOk,
          result,
          note,
          source,
          sample_violations: afterViolations.slice(0, 3),
        };
        results.push(row);

        console.log(
          `| ${combo.name} | ${row.constraints} | ${offset} | ${row.count} | ${row.invalid_raw} | ${row.invalid_after} | ${ms}${note ? ` (${note})` : ""} | ${sortOk ? "Y" : "N"} | ${result} |`
        );
        if (afterViolations.length) {
          for (const v of afterViolations.slice(0, 3)) {
            console.error(`  !! ${v.id} ${v.name}: ${v.reason}`);
          }
        }
        if (!sortOk) console.error(`  !! sort order violation for ${combo.opts.sort}`);
      } catch (err) {
        anyFail = true;
        const row = {
          combination: combo.name,
          constraints: constraintsLabel(combo.opts),
          offset,
          count: 0,
          invalid_raw: -1,
          invalid_after: -1,
          latency_ms: null,
          sort_ok: false,
          result: "FAIL",
          note: String(err.message || err),
          source: combo.fetch || "browse",
        };
        results.push(row);
        console.log(
          `| ${combo.name} | ${row.constraints} | ${offset} | 0 | - | - | - | N | FAIL |`
        );
        console.error(`  !! ${label}: ${err.message || err}`);
      }
    }
  }

  const summary = {
    total: results.length,
    pass: results.filter((r) => r.result === "PASS").length,
    fail: results.filter((r) => r.result === "FAIL").length,
    incomplete: results.filter((r) => r.result === "INCOMPLETE").length,
    latency_warns: latencyWarns,
    invalid_after_total: results.reduce(
      (s, r) => s + (r.invalid_after > 0 ? r.invalid_after : 0),
      0
    ),
    acceptance_0_invalid: results.every(
      (r) => r.invalid_after === 0 || r.invalid_after === -1
    )
      ? results.every((r) => r.invalid_after === 0)
      : false,
    signed_off: !anyFail && latencyWarns === 0,
  };

  console.log("\n## Summary");
  console.log(JSON.stringify(summary, null, 2));

  if (jsonOut) {
    writeFileSync(jsonOut, JSON.stringify({ summary, results }, null, 2));
    console.log(`Wrote ${jsonOut}`);
  }

  if (anyFail) {
    console.error(
      "\nAcceptance NOT signed off: failures or incomplete paths remain. Filtering system is NOT complete."
    );
    process.exit(1);
  }
  if (latencyWarns > 0) {
    console.error(
      `\nAcceptance NOT signed off: ${latencyWarns} combos exceeded ${LATENCY_WARN_MS}ms. Filtering correctness may pass but latency is not acceptable.`
    );
    process.exit(2);
  }
  console.log("\nAcceptance PASSED: 0 invalid after integrity; latency within budget.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
