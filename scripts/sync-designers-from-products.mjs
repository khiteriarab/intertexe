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

const { data: brands, error: brandsError } = await supabase
  .from("products")
  .select("brand_slug, brand_name, image_url, natural_fiber_percent")
  .eq("approved", "yes")
  .eq("is_active", true)
  .not("brand_slug", "is", null)
  .order("brand_slug");

if (brandsError) throw new Error(`Failed to load products: ${brandsError.message}`);

const brandMap = {};
for (const product of brands || []) {
  if (!brandMap[product.brand_slug]) {
    brandMap[product.brand_slug] = {
      slug: product.brand_slug,
      name: product.brand_name,
      image_url: product.image_url,
      nfp_sum: 0,
      count: 0,
    };
  }
  brandMap[product.brand_slug].nfp_sum += product.natural_fiber_percent || 0;
  brandMap[product.brand_slug].count++;
}

const { data: existingDesigners, error: designersError } = await supabase
  .from("designers")
  .select("slug");

if (designersError) throw new Error(`Failed to load designers: ${designersError.message}`);

const existingSlugs = new Set(existingDesigners?.map((d) => d.slug) || []);
const missingBrands = Object.values(brandMap).filter((b) => !existingSlugs.has(b.slug));

console.log(`Found ${missingBrands.length} brands missing from designers table`);

let created = 0;
for (const brand of missingBrands) {
  const avgNFP = Math.round(brand.nfp_sum / Math.max(brand.count, 1));
  const { error } = await supabase.from("designers").insert({
    slug: brand.slug,
    name: brand.name,
    hero_image: brand.image_url,
    natural_fiber_percent: avgNFP,
    status: "active",
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error(`Failed to create designer for ${brand.name}:`, error.message);
  } else {
    created++;
    console.log(`Created designer: ${brand.name} (${brand.slug}) - NFP: ${avgNFP}%`);
  }
}

console.log(`Designer sync complete. Created ${created} new designer records.`);

const { count: totalDesigners, error: totalError } = await supabase
  .from("designers")
  .select("*", { count: "exact", head: true });

if (totalError) throw new Error(`Failed to count designers: ${totalError.message}`);
console.log(`Total designers now: ${totalDesigners ?? 0}`);
