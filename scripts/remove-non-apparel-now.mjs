import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_KEY");
}

const supabase = createClient(supabaseUrl, supabaseKey);

const targetId = "6a9245b2-cde8-4758-8fcf-955aaf188cb0";
const { error: targetErr } = await supabase
  .from("products")
  .update({
    is_active: false,
    approved: "no",
    display_excluded_reason: "non_apparel_product",
  })
  .eq("id", targetId);

console.log("TARGET_REMOVED", targetErr ? `no:${targetErr.message}` : "yes");

const nonApparelTerms = [
  "lubricant",
  "lube",
  "supplement",
  "vitamin",
  "candle",
  "perfume",
  "fragrance",
  "skincare",
  "serum",
  "moisturizer",
  "toy",
  "accessory kit",
  "gift set",
  "beauty",
  "cosmetic",
  "book",
  "home",
  "decor",
  "furniture",
  "electronics",
  "shoe care",
  "bag care",
  "leather care",
  "cleaner",
];

const found = new Map();
for (const term of nonApparelTerms) {
  const { data, error } = await supabase
    .from("products")
    .select("id,name,brand_name,category")
    .ilike("name", `%${term}%`)
    .eq("approved", "yes")
    .eq("is_active", true)
    .limit(50);
  if (error) {
    console.log("TERM_ERR", term, error.message);
    continue;
  }
  for (const p of data || []) found.set(p.id, p);
}

const ids = [...found.keys()];
console.log("FOUND_COUNT", ids.length);

if (ids.length) {
  const { error } = await supabase
    .from("products")
    .update({
      is_active: false,
      approved: "no",
      display_excluded_reason: "non_apparel_product",
    })
    .in("id", ids);
  if (error) console.log("BULK_UPDATE_ERR", error.message);
  else console.log("BULK_UPDATED", ids.length);
}

for (const p of [...found.values()]) {
  console.log("REMOVED", `${p.brand_name || "Unknown"} — ${p.name} — ${p.id}`);
}
