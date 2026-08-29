#!/usr/bin/env node
/**
 * Gate: catalog browse must stay fast (products-first, no full-category COUNT/dedupe).
 *
 * Usage:
 *   node scripts/guard-catalog-browse-speed.mjs           # static repo check
 *   node scripts/guard-catalog-browse-speed.mjs --live      # + production RPC latency
 *   node scripts/guard-catalog-browse-speed.mjs --strict    # canonical hash must match migration
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  REPO_ROOT,
  SUPERSEDED_MIGRATION_MARKERS,
  validateRepoCatalogBrowseSpeed,
  validateTaxonomyBrowseSql,
} from "./lib/catalog-browse-speed-contract.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LIVE = process.argv.includes("--live");
const STRICT = process.argv.includes("--strict");
const LATENCY_BUDGET_MS = Number(process.env.CATALOG_BROWSE_BUDGET_MS || 8000);

function loadEnv() {
  for (const f of [path.join(REPO_ROOT, ".env"), path.join(REPO_ROOT, "../.env")]) {
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
}

async function liveProbe() {
  loadEnv();
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.warn("SKIP live probe: missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
    return { ok: true, skipped: true };
  }

  const sb = createClient(url, key, { auth: { persistSession: false } });
  const probes = [
    { label: "clothing/all", slug: "clothing/all", maxMs: LATENCY_BUDGET_MS },
    { label: "clothing/dresses", slug: "clothing/dresses", maxMs: LATENCY_BUDGET_MS },
    { label: "clothing/tanks-and-camisoles", slug: "clothing/tanks-and-camisoles", maxMs: LATENCY_BUDGET_MS },
    { label: "clothing/tops", slug: "clothing/tops", maxMs: LATENCY_BUDGET_MS },
    { label: "clothing/knitwear", slug: "clothing/knitwear", maxMs: LATENCY_BUDGET_MS },
  ];

  const errors = [];
  for (const p of probes) {
    const t0 = performance.now();
    const { data, error } = await sb.rpc("catalog_taxonomy_browse_page", {
      p_region: "us",
      p_taxonomy_slug: p.slug,
      p_material_family: null,
      p_material_subtype: null,
      p_fabric_construction: null,
      p_min_nfp: null,
      p_color: null,
      p_brand_slug: null,
      p_search: null,
      p_min_price: null,
      p_max_price: null,
      p_sort: "newest",
      p_limit: 24,
      p_offset: 0,
    });
    const ms = Math.round(performance.now() - t0);
    if (error) {
      errors.push(`${p.label}: RPC error ${error.message}`);
      continue;
    }
    const products = data?.products ?? [];
    const n = Array.isArray(products) ? products.length : 0;
    if (ms > p.maxMs) {
      errors.push(`${p.label}: ${ms}ms > ${p.maxMs}ms budget (${n} products)`);
    } else {
      console.log(`PASS live ${p.label}: ${ms}ms (${n} products)`);
    }

    // clothing/all must delegate — v2 responses include rpc_version catalog_browse_page_v2
    if (p.slug === "clothing/all") {
      const rpcVersion = data?.debug?.rpc_version || data?.rpc_version;
      if (rpcVersion && !String(rpcVersion).includes("catalog_browse_page_v2")) {
        errors.push(
          `${p.label}: expected catalog_browse_page_v2 delegate, got rpc_version=${rpcVersion ?? "missing"}`
        );
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

function checkSupersededApplyTarget(argvFiles) {
  const errors = [];
  for (const file of argvFiles) {
    const base = path.basename(file);
    if (SUPERSEDED_MIGRATION_MARKERS.includes(base)) {
      errors.push(`Refusing to apply superseded slow migration: ${base}`);
    }
  }
  return errors;
}

async function main() {
  console.log("=== Catalog browse speed guard ===\n");

  const applyTargets = process.argv.filter((a) => a.endsWith(".sql"));
  const supersededErrors = checkSupersededApplyTarget(applyTargets);
  if (supersededErrors.length) {
    for (const e of supersededErrors) console.error("FAIL", e);
    process.exit(1);
  }

  for (const file of applyTargets) {
    const sql = readFileSync(path.resolve(file), "utf8");
    const check = validateTaxonomyBrowseSql(sql, path.basename(file));
    if (!check.skipped && !check.ok) {
      console.error(`FAIL apply target ${file} violates browse speed contract:`);
      for (const e of check.errors) console.error(" ", e);
      process.exit(1);
    }
  }

  const repo = validateRepoCatalogBrowseSpeed({ strictCanonicalHash: STRICT });
  for (const n of repo.notes) console.log("OK", n);
  for (const w of repo.warnings) console.warn("WARN", w);
  if (!repo.ok) {
    for (const e of repo.errors) console.error("FAIL", e);
    process.exit(1);
  }

  if (LIVE) {
    console.log("");
    const live = await liveProbe();
    if (!live.skipped && !live.ok) {
      for (const e of live.errors) console.error("FAIL", e);
      process.exit(1);
    }
  }

  console.log("\nCatalog browse speed guard passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
