#!/usr/bin/env node
/**
 * Production catalog latency audit (no warming).
 *   node --import tsx scripts/catalog-latency-audit.mjs
 */
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { buildCatalogBrowseV2Params } from "../lib/catalog-browse-v2.ts";

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
      )
        v = v.slice(1, -1);
      if (!process.env[m[1]]) process.env[m[1]] = v;
    }
  }
}
loadEnv();

const sb = createClient(
  (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/$/, ""),
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  { auth: { persistSession: false } }
);

const CATEGORIES = [
  "dresses",
  "trousers",
  "tops",
  "knitwear",
  "shoes",
  "bags",
  "skirts",
  "outerwear",
];
const MATERIALS = ["silk", "linen", "cotton", "wool", "cashmere"];
const COLORS = ["black", "white", "blue", "beige"];
const DESIGNERS = ["toteme", "the-row", "khaite"]; // brand_slug if present

const cases = [];
for (const category of CATEGORIES) {
  cases.push({ name: `${category}`, opts: { category, limit: 24, offset: 0, sort: "newest" } });
  cases.push({
    name: `${category}+price_asc`,
    opts: { category, limit: 24, offset: 0, sort: "price_asc" },
  });
  cases.push({
    name: `${category}+price_desc`,
    opts: { category, limit: 24, offset: 0, sort: "price_desc" },
  });
  for (const fiber of MATERIALS.slice(0, 3)) {
    cases.push({
      name: `${category}+${fiber}`,
      opts: { category, fiber, limit: 24, offset: 0, sort: "newest" },
    });
  }
  for (const color of COLORS.slice(0, 2)) {
    cases.push({
      name: `${category}+color:${color}`,
      opts: { category, color, limit: 24, offset: 0, sort: "newest" },
    });
  }
  for (const offset of [0, 24, 48]) {
    cases.push({
      name: `${category}+offset${offset}`,
      opts: { category, limit: 24, offset, sort: "newest" },
    });
  }
}
cases.push({ name: "sale_default", opts: { limit: 24, offset: 0, sort: "newest", onSale: true } });
cases.push({
  name: "sale_tops",
  opts: { category: "tops", limit: 24, offset: 0, sort: "newest", onSale: true },
});
cases.push({ name: "new_in", opts: { limit: 24, offset: 0, sort: "newest" } });
for (const brand of DESIGNERS) {
  cases.push({
    name: `designer:${brand}`,
    opts: { brand, limit: 24, offset: 0, sort: "newest" },
  });
}

async function runOne(c) {
  const params = buildCatalogBrowseV2Params({
    region: "us",
    apparelOnly: true,
    ...c.opts,
  });
  // onSale is not in browse v2 params — use sale RPC path when flagged
  const t0 = Date.now();
  let n = 0;
  let err = null;
  try {
    if (c.opts.onSale) {
      const { data, error } = await sb.rpc("sale_catalog_list", {
        p_preferred_region: "us",
        p_fallback_region: "us",
        p_fiber: null,
        p_max_price: null,
        p_limit: 24,
        p_offset: c.opts.offset || 0,
        p_category: c.opts.category || null,
        p_brand_slug: null,
        p_color: null,
      });
      if (error) err = error.message;
      n = Array.isArray(data) ? data.length : 0;
    } else {
      const { data, error } = await sb.rpc("catalog_browse_page_v2", params);
      if (error) err = error.message;
      n = Array.isArray(data?.products) ? data.products.length : 0;
    }
  } catch (e) {
    err = e instanceof Error ? e.message : String(e);
  }
  const ms = Date.now() - t0;
  return { name: c.name, ms, n, err, over_2s: ms > 2000, over_5s: ms > 5000 };
}

const results = [];
for (const c of cases) {
  results.push(await runOne(c));
  process.stdout.write(".");
}
console.log("");

results.sort((a, b) => b.ms - a.ms);
const over5 = results.filter((r) => r.over_5s);
const over2 = results.filter((r) => r.over_2s);
const out = {
  ran_at: new Date().toISOString(),
  total: results.length,
  over_2s: over2.length,
  over_5s: over5.length,
  worst_10: results.slice(0, 10),
  knitwear_price_asc: results.find((r) => r.name === "knitwear+price_asc") || null,
  results,
};

const art = path.join(root, "scripts/artifacts/catalog-latency-audit.json");
fs.mkdirSync(path.dirname(art), { recursive: true });
fs.writeFileSync(art, JSON.stringify(out, null, 2));
console.log(JSON.stringify({ summary: {
  total: out.total,
  over_2s: out.over_2s,
  over_5s: out.over_5s,
  knitwear_price_asc: out.knitwear_price_asc,
  worst_10: out.worst_10,
}, artifact: art }, null, 2));
