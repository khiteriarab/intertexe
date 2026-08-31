#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq);
    if (process.env[key]) continue;
    let val = trimmed.slice(eq + 1);
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

loadEnvFile(".env.development.local");

import { assertCatalogBulkMutationsAllowed } from "./lib/catalog-bulk-guard.mjs";
assertCatalogBulkMutationsAllowed();

const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = process.env.SUPABASE_PROJECT_REF || "burrylupizvggupsryuj";
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function sql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

const counts = await sql(`
SELECT
  count(*) FILTER (WHERE is_displayable = true) AS displayable_true,
  count(*) FILTER (WHERE approved = 'yes' AND coalesce(natural_fiber_percent,0) >= 80 AND is_displayable IS DISTINCT FROM true AND coalesce(is_active,true)) AS hidden_approved_nfp80
FROM products;
`);
console.log("counts", counts[0]);

const restore = await sql(`SELECT public.restore_is_displayable_batch(10000) AS fixed;`);
console.log("restore_batch", restore[0]);

const t0 = Date.now();
const { data, error } = await sb.rpc("catalog_list", {
  p_preferred_region: "us",
  p_fallback_region: "us",
  p_fiber: "cashmere",
  p_category: null,
  p_brand_slug: null,
  p_search: null,
  p_min_nfp: 80,
  p_limit: 5,
  p_offset: 0,
});
console.log("catalog_list_ms", Date.now() - t0, error?.message || `rows=${data?.length ?? 0}`);

const t1 = Date.now();
const { data: tax } = await sb.rpc("catalog_taxonomy_browse_page", {
  p_region: "us",
  p_taxonomy_slug: "clothing/tops",
  p_material_family: null,
  p_material_subtype: null,
  p_fabric_construction: null,
  p_min_nfp: 80,
  p_color: null,
  p_brand_slug: null,
  p_search: null,
  p_min_price: null,
  p_max_price: null,
  p_sort: "newest",
  p_limit: 5,
  p_offset: 0,
});
console.log("taxonomy_ms", Date.now() - t1, "products", tax?.products?.length ?? 0, "total", tax?.total);
