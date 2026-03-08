import { createClient } from "@supabase/supabase-js";
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);
async function main() {
  const { data } = await supabase
    .from("products")
    .select("name, category, url")
    .eq("brand_slug", "diesel")
    .eq("approved", "yes")
    .limit(30);
  console.log("Diesel products sample:");
  (data || []).forEach((p: any) => console.log(`  [${p.category}] ${p.name} | ${p.url?.substring(0, 60)}`));
}
main();
