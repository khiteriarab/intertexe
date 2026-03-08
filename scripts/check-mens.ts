import { createClient } from "@supabase/supabase-js";
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);
async function main() {
  // Check Diesel products that look like men's products
  const { data } = await supabase
    .from("products")
    .select("name, category")
    .eq("brand_slug", "diesel")
    .eq("approved", "yes")
    .limit(50);
  
  const mensPatterns = [/\bmen/i, /\bman/i, /\bboxer/i, /\bbriefs/i, /\bguy/i];
  const mensProducts = (data || []).filter((p: any) => mensPatterns.some(pat => pat.test(p.name)));
  console.log("Diesel men's products (sample):", mensProducts.length);
  mensProducts.slice(0, 15).forEach((p: any) => console.log(`  ${p.name} [${p.category}]`));
  
  // Also check for "Ritz Men's" from Frame 
  const { data: frame } = await supabase
    .from("products")
    .select("name")
    .eq("brand_slug", "frame")
    .ilike("name", "%men%")
    .limit(10);
  console.log("\nFrame men's products:", (frame || []).length);
  (frame || []).forEach((p: any) => console.log(`  ${p.name}`));
}
main();
