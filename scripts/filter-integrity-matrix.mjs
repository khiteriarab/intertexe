#!/usr/bin/env node
/**
 * Filter integrity matrix — every returned product must satisfy active filters.
 *
 *   node --import tsx scripts/filter-integrity-matrix.mjs
 *
 * Loads SUPABASE from ../.env or .env.vercel.local.
 * Exit 1 if any product violates filters after integrity gate.
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import {
  productViolatesFilters,
  filterProductsForIntegrity,
  integritySpecFromBrowseOpts,
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
  console.error("Missing SUPABASE_URL / SERVICE_ROLE_KEY (checked ../.env and .env.vercel.local)");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

function constraintsLabel(opts) {
  const parts = [];
  if (opts.category) parts.push(`category=${opts.category}`);
  if (opts.fiber) parts.push(`fiber=${opts.fiber}`);
  if (opts.maxPrice != null) parts.push(`maxPrice=${opts.maxPrice}`);
  if (opts.minPrice != null) parts.push(`minPrice=${opts.minPrice}`);
  if (opts.brand) parts.push(`brand=${opts.brand}`);
  if (opts.color) parts.push(`color=${opts.color}`);
  if (opts.sale === true) parts.push("sale=true");
  if (opts.justIn === true) parts.push("justIn=true");
  if (opts.apparelOnly === false) parts.push("apparelOnly=false");
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
    price: row.price,
    composition: row.composition != null ? String(row.composition) : "",
    color: row.color != null ? String(row.color) : null,
    is_sale: row.is_sale === true,
    shop_material_family:
      row.shop_material_family != null ? String(row.shop_material_family) : null,
    material_primary: row.material_primary != null ? String(row.material_primary) : null,
    material_subtype: row.material_subtype != null ? String(row.material_subtype) : null,
    fabric_construction:
      row.fabric_construction != null ? String(row.fabric_construction) : null,
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
    apparelOnly: opts.apparelOnly !== false,
  });
  const t0 = Date.now();
  const { data, error } = await sb.rpc("catalog_browse_page_v2", params);
  const ms = Date.now() - t0;
  if (error) throw new Error(error.message);
  const payload = data ?? {};
  const rows = Array.isArray(payload.products) ? payload.products : [];
  return { rows, ms, params };
}

function countViolations(products, spec) {
  const violations = [];
  for (const p of products) {
    const reason = productViolatesFilters(p, spec);
    if (reason) violations.push({ id: p.id, name: p.name, reason });
  }
  return violations;
}

async function pickDressesBrand() {
  const { rows } = await callBrowse({ category: "dresses", limit: 24, offset: 0 });
  const slug = rows.map((r) => String(r.brand_slug || "").toLowerCase()).find(Boolean);
  return slug || null;
}

async function main() {
  const brand = await pickDressesBrand();
  if (!brand) {
    console.warn("WARN: no brand found on dresses page 1 — brand combo will skip brand constraint");
  }

  /** @type {{ name: string, opts: Record<string, unknown> }[]} */
  const combos = [
    { name: "jumpsuits maxPrice 200", opts: { category: "jumpsuits", maxPrice: 200 } },
    {
      name: "dresses fiber silk maxPrice 500",
      opts: { category: "dresses", fiber: "silk", maxPrice: 500 },
    },
    {
      name: "dresses fiber silk maxPrice 300",
      opts: { category: "dresses", fiber: "silk", maxPrice: 300 },
    },
    {
      name: "trousers fiber linen",
      opts: { category: "trousers", fiber: "linen" },
    },
    {
      name: "trousers fiber linen sale",
      opts: { category: "trousers", fiber: "linen", sale: true },
    },
    {
      name: "shoes fiber leather maxPrice 300",
      opts: { category: "shoes", fiber: "leather", maxPrice: 300, apparelOnly: false },
    },
    {
      name: "fiber cashmere only (apparel)",
      opts: { fiber: "cashmere", category: "clothing", apparelOnly: true },
    },
    {
      name: "fiber cashmere justIn",
      opts: { fiber: "cashmere", category: "clothing", justIn: true, apparelOnly: true },
    },
    {
      name: "dresses color black maxPrice 400",
      opts: { category: "dresses", color: "black", maxPrice: 400 },
    },
    {
      name: brand ? `dresses brand ${brand} maxPrice 600` : "dresses brand (skipped)",
      opts: brand
        ? { category: "dresses", brand, maxPrice: 600 }
        : { category: "dresses", maxPrice: 600 },
    },
    {
      name: "tops fiber cotton color white maxPrice 250",
      opts: { category: "tops", fiber: "cotton", color: "white", maxPrice: 250 },
    },
    {
      name: "skirts fiber silk maxPrice 400",
      opts: { category: "skirts", fiber: "silk", maxPrice: 400 },
    },
    { name: "jumpsuits no price", opts: { category: "jumpsuits" } },
    { name: "trousers maxPrice 200", opts: { category: "trousers", maxPrice: 200 } },
    { name: "shoes no extras", opts: { category: "shoes", apparelOnly: false } },
    {
      name: "dresses sale maxPrice 300",
      opts: { category: "dresses", sale: true, maxPrice: 300 },
    },
  ];

  const offsets = [0, 24];
  let anyFail = false;

  console.log("| combination | constraints | offset | count | invalid_raw | invalid_after | latency_ms | result |");
  console.log("|---|---|---:|---:|---:|---:|---:|---|");

  for (const combo of combos) {
    const spec = integritySpecFromBrowseOpts(combo.opts);
    for (const offset of offsets) {
      const label = `${combo.name} @${offset}`;
      try {
        const { rows, ms } = await callBrowse({ ...combo.opts, limit: 24, offset });
        const products = rows.map(toIntegrityProduct);
        const rawViolations = countViolations(products, spec);
        const after = filterProductsForIntegrity(products, spec);
        const afterViolations = countViolations(after, spec);
        const pass = afterViolations.length === 0;
        if (!pass) anyFail = true;
        console.log(
          `| ${combo.name} | ${constraintsLabel(combo.opts)} | ${offset} | ${after.length} | ${rawViolations.length} | ${afterViolations.length} | ${ms} | ${pass ? "PASS" : "FAIL"} |`
        );
        if (afterViolations.length) {
          for (const v of afterViolations.slice(0, 5)) {
            console.error(`  !! ${v.id} ${v.name}: ${v.reason}`);
          }
        }
      } catch (err) {
        anyFail = true;
        console.log(
          `| ${combo.name} | ${constraintsLabel(combo.opts)} | ${offset} | 0 | - | - | - | FAIL |`
        );
        console.error(`  !! ${label}: ${err.message || err}`);
      }
    }
  }

  if (anyFail) {
    console.error("\nAcceptance FAILED: invalid products after integrity filter.");
    process.exit(1);
  }
  console.log("\nAcceptance PASSED: 0 invalid after integrity.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
