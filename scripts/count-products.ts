import { createClient } from "@supabase/supabase-js";
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);
async function main() {
  const { count } = await supabase.from("products").select("*", { count: "exact", head: true });
  console.log("Total products:", count);
  
  const { data: sample } = await supabase.from("products").select("*").limit(3);
  console.log("\nSample product fields:", Object.keys(sample?.[0] || {}));
  console.log("\nSample product:", JSON.stringify(sample?.[0], null, 2));
  
  // Count by brand
  const { data: brands } = await supabase.from("products").select("brand_slug");
  const brandCounts: Record<string, number> = {};
  (brands || []).forEach((p: any) => { brandCounts[p.brand_slug] = (brandCounts[p.brand_slug] || 0) + 1; });
  const sorted = Object.entries(brandCounts).sort((a, b) => b[1] - a[1]);
  console.log("\nTop brands by product count:");
  sorted.slice(0, 20).forEach(([slug, count]) => console.log(`  ${slug}: ${count}`));
  
  // Check if products have unique IDs/slugs suitable for URLs
  const { data: ids } = await supabase.from("products").select("id, product_name, brand_slug").limit(5);
  console.log("\nProduct IDs sample:");
  ids?.forEach((p: any) => console.log(`  id=${p.id} | ${p.brand_slug} | ${p.product_name}`));
  
  // Check designers that exist
  const productBrandSlugs = [...new Set((brands || []).map((p: any) => p.brand_slug).filter(Boolean))];
  const { data: matchedDesigners } = await supabase.from("designers").select("slug, name").in("slug", productBrandSlugs);
  console.log("\nProduct brand slugs that exist in designers table:");
  matchedDesigners?.forEach((d: any) => console.log(`  ${d.slug} -> ${d.name}`));
  console.log(`  (${matchedDesigners?.length} of ${productBrandSlugs.length} matched)`);
}
main().catch(console.error);
