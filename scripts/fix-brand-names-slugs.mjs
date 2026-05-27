/**
 * Fix corrupted brand names and slug inconsistencies in live_products_apparel + products.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../../.env");
const env = readFileSync(envPath, "utf8");
const key = (env.match(/^SUPABASE_SERVICE_ROLE_KEY=(.+)$/m) || [])[1]
  ?.trim()
  .replace(/^["']|["']$/g, "");
const supabase = createClient(
  "https://burrylupizvggupsryuj.supabase.co",
  key
);

const CANONICAL_FAITHFULL_SLUG = "faithfull-the-brand";
const CANONICAL_FAITHFULL_NAME = "Faithfull the Brand";

async function countLive(filter) {
  let q = supabase
    .from("live_products_apparel")
    .select("*", { count: "exact", head: true })
    .eq("region", "us");
  for (const [col, val] of Object.entries(filter)) {
    q = q.eq(col, val);
  }
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

async function updateLive(set, filter) {
  let q = supabase.from("live_products_apparel").update(set);
  for (const [col, val] of Object.entries(filter)) {
    q = q.eq(col, val);
  }
  const { data, error } = await q.select("id");
  if (error) throw error;
  return data?.length ?? 0;
}

async function updateProducts(set, filter) {
  let q = supabase.from("products").update(set);
  for (const [col, val] of Object.entries(filter)) {
    q = q.eq(col, val);
  }
  const { data, error } = await q.select("id");
  if (error) throw error;
  return data?.length ?? 0;
}

console.log("=== BEFORE ===");
console.log("'s Max Mara:", await countLive({ brand_name: "'s Max Mara" }));
console.log("rag-bone live:", await countLive({ brand_slug: "rag-bone" }));
console.log("rag-and-bone live:", await countLive({ brand_slug: "rag-and-bone" }));
console.log("lagence live:", await countLive({ brand_slug: "lagence" }));
console.log("l-agence live:", await countLive({ brand_slug: "l-agence" }));
console.log("faithfull slug:", await countLive({ brand_slug: "faithfull" }));
console.log("faithfull-the-brand slug:", await countLive({ brand_slug: "faithfull-the-brand" }));

// 1. Weekend Max Mara
const n1 = await updateLive(
  { brand_name: "Weekend Max Mara" },
  { brand_name: "'s Max Mara" }
);
const n1p = await updateProducts(
  { brand_name: "Weekend Max Mara" },
  { brand_name: "'s Max Mara" }
);
console.log(`\nFixed Weekend Max Mara: live=${n1} products=${n1p}`);

// 2. rag-bone → rag-and-bone
const n2 = await updateLive({ brand_slug: "rag-and-bone" }, { brand_slug: "rag-bone" });
const n2p = await updateProducts({ brand_slug: "rag-and-bone" }, { brand_slug: "rag-bone" });
console.log(`rag-bone → rag-and-bone: live=${n2} products=${n2p}`);

// 3. lagence → l-agence
const n3 = await updateLive({ brand_slug: "l-agence" }, { brand_slug: "lagence" });
const n3p = await updateProducts({ brand_slug: "l-agence" }, { brand_slug: "lagence" });
console.log(`lagence → l-agence: live=${n3} products=${n3p}`);

// 4. Merge faithfull → faithfull-the-brand
const n4 = await updateLive(
  { brand_slug: CANONICAL_FAITHFULL_SLUG, brand_name: CANONICAL_FAITHFULL_NAME },
  { brand_slug: "faithfull" }
);
const n4b = await updateLive(
  { brand_name: CANONICAL_FAITHFULL_NAME },
  { brand_slug: CANONICAL_FAITHFULL_SLUG }
);
const n4p = await updateProducts(
  { brand_slug: CANONICAL_FAITHFULL_SLUG, brand_name: CANONICAL_FAITHFULL_NAME },
  { brand_slug: "faithfull" }
);
const n4pb = await updateProducts(
  { brand_name: CANONICAL_FAITHFULL_NAME },
  { brand_slug: CANONICAL_FAITHFULL_SLUG }
);
console.log(
  `Faithfull merge: live slug faithfull→canonical=${n4}, live name normalize=${n4b}, products slug=${n4p}, products name=${n4pb}`
);

// designers table
for (const [from, to] of [
  ["rag-bone", "rag-and-bone"],
  ["ragbone", "rag-and-bone"],
  ["lagence", "l-agence"],
  ["faithfull", "faithfull-the-brand"],
]) {
  const { error } = await supabase.from("designers").update({ slug: to }).eq("slug", from);
  console.log(`designers ${from} → ${to}:`, error ? error.message : "ok");
}

const { error: dFaith } = await supabase
  .from("designers")
  .update({ name: CANONICAL_FAITHFULL_NAME })
  .eq("slug", CANONICAL_FAITHFULL_SLUG);
console.log("designers faithfull name:", dFaith ? dFaith.message : "ok");

console.log("\n=== AFTER ===");
console.log("Weekend Max Mara:", await countLive({ brand_name: "Weekend Max Mara" }));
console.log("'s Max Mara:", await countLive({ brand_name: "'s Max Mara" }));
console.log("rag-and-bone:", await countLive({ brand_slug: "rag-and-bone" }));
console.log("l-agence:", await countLive({ brand_slug: "l-agence" }));
console.log("faithfull-the-brand:", await countLive({ brand_slug: "faithfull-the-brand" }));
console.log("faithfull (old slug):", await countLive({ brand_slug: "faithfull" }));
