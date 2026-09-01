#!/usr/bin/env node
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

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
loadEnvFile(".env.local");

const sb = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

async function count(label, fn) {
  const { count, error } = await fn();
  console.log(`${label}: ${count ?? "null"} ${error?.message ?? ""}`.trim());
}

await count("live_products_apparel exact", () =>
  sb.from("live_products_apparel").select("id", { count: "exact", head: true })
);
await count("is_displayable exact", () =>
  sb.from("products").select("id", { count: "exact", head: true }).eq("is_displayable", true)
);
await count("is_displayable false", () =>
  sb.from("products").select("id", { count: "exact", head: true }).eq("is_displayable", false)
);
await count("approved yes nfp>=80", () =>
  sb.from("products").select("id", { count: "exact", head: true }).eq("approved", "yes").gte("natural_fiber_percent", 80)
);
const { data: sample } = await sb
  .from("products")
  .select("id,is_displayable,natural_fiber_percent,fiber_primary,shop_material_family")
  .eq("approved", "yes")
  .ilike("fiber_primary", "%cashmere%")
  .limit(5);
console.log("cashmere sample", JSON.stringify(sample));
await count("homepage new_in", () =>
  sb.from("homepage_feed_items").select("id", { count: "exact", head: true }).eq("rail_key", "top:new_in")
);

for (const [name, args] of [
  ["catalog_list", { p_preferred_region: "us", p_fallback_region: "us", p_limit: 3, p_offset: 0, p_min_nfp: 80 }],
  [
    "catalog_taxonomy_browse_v2 tops",
    {
      p_department: "clothing",
      p_taxonomy_slug: "clothing/tops",
      p_preferred_region: "us",
      p_fallback_region: "us",
      p_limit: 3,
      p_offset: 0,
    },
  ],
  [
    "catalog_list cashmere",
    {
      p_preferred_region: "us",
      p_fallback_region: "us",
      p_limit: 5,
      p_offset: 0,
      p_material_family: "cashmere",
      p_min_nfp: 80,
    },
  ],
]) {
  const rpcName = name.includes("browse")
    ? "catalog_taxonomy_browse_v2"
    : name.includes("count")
      ? "catalog_list_count"
      : "catalog_list";
  const { data, error } = await sb.rpc(rpcName, args);
  if (error) console.log(name, "ERROR", error.message);
  else console.log(name, "OK", Array.isArray(data) ? `rows=${data.length}` : JSON.stringify(data));
}
