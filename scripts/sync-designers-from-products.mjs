import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing SUPABASE URL or SUPABASE_SERVICE_ROLE_KEY in .env.local/.env");
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const PAGE_SIZE = 1000;
const MAX_PAGES = 60;
const uniqueBrands = new Map();

for (let page = 0; page < MAX_PAGES; page++) {
  const offset = page * PAGE_SIZE;
  const { data, error } = await supabase
    .from("live_products_apparel")
    .select("brand_slug, brand_name")
    .eq("region", "us")
    .not("brand_slug", "is", null)
    .range(offset, offset + PAGE_SIZE - 1);

  if (error) throw new Error(`Failed to load catalog brands: ${error.message}`);

  const rows = data || [];
  for (const product of rows) {
    const slug = String(product.brand_slug || "").trim().toLowerCase();
    const name = String(product.brand_name || slug).trim();
    if (!slug) continue;
    if (!uniqueBrands.has(slug)) uniqueBrands.set(slug, name);
  }
  if (rows.length < PAGE_SIZE) break;
}

console.log(`Found ${uniqueBrands.size} unique brands in live US catalog`);

let upserted = 0;
for (const [slug, name] of uniqueBrands) {
  const { error } = await supabase.from("designers").upsert(
    {
      slug,
      name,
      status: "active",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "slug" }
  );
  if (error) {
    console.error(`Failed to upsert ${slug}:`, error.message);
  } else {
    upserted++;
  }
}

console.log(`Designer sync complete. Upserted ${upserted} brands.`);

const { count } = await supabase
  .from("designers")
  .select("*", { count: "exact", head: true });

console.log(`Total designers now: ${count ?? 0}`);
