import { createClient } from "@supabase/supabase-js";
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);
async function main() {
  // Look for Frame products with "Ritz Men" or "Men's" in the name
  const { data } = await supabase
    .from("products")
    .select("name, category, image_url")
    .eq("brand_slug", "frame")
    .or("name.ilike.%men's%,name.ilike.%Ritz Men%")
    .limit(20);
  console.log("Frame potential men's products:");
  (data || []).forEach((p: any) => console.log(`  [${p.category}] ${p.name}`));
  
  // Check all brands for "Men" in product names
  const { data: allMens } = await supabase
    .from("products")
    .select("brand_slug, name, category")
    .or("name.ilike.%men's%,name.ilike.% man %,name.ilike.%boxer%,name.ilike.%briefs%")
    .eq("approved", "yes")
    .limit(30);
  console.log("\nAll potential men's products across brands:");
  (allMens || []).forEach((p: any) => console.log(`  [${p.brand_slug}] ${p.name}`));
}
main();
