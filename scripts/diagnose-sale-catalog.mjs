import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const parentEnv = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", ".env");
const raw = readFileSync(parentEnv, "utf8");
const env = {};
for (const line of raw.split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const sb = createClient(env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function count(q) {
  const { count, error } = await q;
  if (error) return `err:${error.message}`;
  return count ?? 0;
}

console.log("=== LIVE VIEW SALE COUNTS ===");
for (const region of ["us", "uk", "eu", null]) {
  let q = sb.from("live_products_apparel").select("*", { count: "exact", head: true }).eq("is_sale", true);
  if (region) q = q.eq("region", region);
  console.log(`Sale live_products_apparel ${region || "all"}:`, await count(q));
}

console.log("\n=== RAW PRODUCTS SALE ===");
for (const region of ["us", "uk", "eu"]) {
  const total = await count(
    sb
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("is_sale", true)
      .eq("region", region)
      .eq("approved", "yes")
      .eq("is_active", true)
  );
  const nfp = await count(
    sb
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("is_sale", true)
      .eq("region", region)
      .eq("approved", "yes")
      .eq("is_active", true)
      .gte("natural_fiber_percent", 80)
  );
  const displayable = await count(
    sb
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("is_sale", true)
      .eq("region", region)
      .eq("is_displayable", true)
  );
  const nullDisplay = await count(
    sb
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("is_sale", true)
      .eq("region", region)
      .eq("approved", "yes")
      .eq("is_active", true)
      .is("is_displayable", null)
  );
  console.log(`Raw sale ${region}: total=${total} nfp80+=${nfp} is_displayable=${displayable} displayable_null=${nullDisplay}`);
}

console.log("\n=== US SALE RPC ===");
const { count: rpcCount } = await sb.rpc("sale_catalog_count", {
  p_fiber: null,
  p_max_price: null,
  p_region: "us",
});
console.log("sale_catalog_count us:", rpcCount);

const { data: rpcList, error: listErr } = await sb.rpc("sale_catalog_list", {
  p_preferred_region: "us",
  p_fallback_region: "us",
  p_fiber: null,
  p_max_price: null,
  p_limit: 48,
  p_offset: 0,
});
console.log("sale_catalog_list us limit 48:", listErr?.message || rpcList?.length);

const { data: sample } = await sb
  .from("products")
  .select("id, name, brand_name, price, original_price, is_sale, region, natural_fiber_percent, is_displayable")
  .eq("is_sale", true)
  .eq("region", "us")
  .eq("approved", "yes")
  .limit(5);
console.log("\nSample:", JSON.stringify(sample, null, 2));

// Price floor simulation (iOS $200 min)
const { data: liveSalePrices } = await sb
  .from("live_products_apparel")
  .select("price")
  .eq("is_sale", true)
  .eq("region", "us")
  .limit(5000);
let under200 = 0;
let over200 = 0;
for (const p of liveSalePrices || []) {
  const n = parseFloat(String(p.price || "").replace(/[^0-9.]/g, "")) || 0;
  if (n >= 200) over200++;
  else if (n > 0) under200++;
}
console.log(`\nUS live sale price check (sample ${liveSalePrices?.length}): >=$200: ${over200} <$200: ${under200}`);
