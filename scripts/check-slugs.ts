import { createClient } from "@supabase/supabase-js";
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);
async function main() {
  const { data: products } = await supabase.from("products").select("brand_slug").not("brand_slug", "is", null);
  const slugs = [...new Set((products || []).map((p: any) => p.brand_slug).filter(Boolean))].sort();
  console.log("Product brand_slugs:", slugs.length);
  slugs.forEach(s => console.log(" ", s));
  
  // Check a few designer slugs for comparison
  const { data: designers } = await supabase.from("designers").select("slug").in("slug", slugs.slice(0, 10));
  console.log("\nMatching designers:", designers?.length);
  designers?.forEach((d: any) => console.log(" ", d.slug));
}
main();
