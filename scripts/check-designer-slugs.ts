import { createClient } from "@supabase/supabase-js";
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);
async function main() {
  const searchTerms = ["row", "cucinelli", "vince", "cos", "filippa", "arket", "reformation", "frame", "sandro", "acne", "toteme", "khaite", "nanushka", "agolde", "eileen", "theory", "maje", "ganni", "rag", "diesel"];
  for (const term of searchTerms) {
    const { data } = await supabase.from("designers").select("slug, name").ilike("slug", "%" + term + "%").limit(3);
    if (data && data.length > 0) {
      data.forEach((d: any) => console.log(d.slug + " -> " + d.name));
    }
  }
}
main();
