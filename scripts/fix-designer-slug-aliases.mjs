/**
 * Safe designer slug fixes — only known product-table aliases (no fuzzy matching).
 */
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const parentEnv = resolve(root, "..", ".env");

dotenv.config({ path: resolve(root, ".env.local") });
dotenv.config({ path: resolve(root, ".env") });
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  const raw = readFileSync(parentEnv, "utf8");
  const m = raw.match(/^SUPABASE_SERVICE_ROLE_KEY=(.+)$/m);
  if (m) process.env.SUPABASE_SERVICE_ROLE_KEY = m[1].trim().replace(/^["']|["']$/g, "");
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/** Designer slug → live_products_apparel brand_slug */
const ALIASES = {
  isabelmarant: "isabel-marant",
  isabel_marant: "isabel-marant",
  "isabel-marant-etoile": "isabel-marant",
  lagence: "l-agence",
  "l-agence": "l-agence",
  "rag-bone": "rag-and-bone",
  ragbone: "rag-and-bone",
  faithfull: "faithfull-the-brand",
};

let fixed = 0;
for (const [from, to] of Object.entries(ALIASES)) {
  if (from === to) continue;
  const { count } = await supabase
    .from("live_products_apparel")
    .select("*", { count: "exact", head: true })
    .eq("brand_slug", to)
    .eq("region", "us");
  if (!count) {
    console.log(`Skip ${from} → ${to}: no products`);
    continue;
  }
  const { error } = await supabase.from("designers").update({ slug: to }).eq("slug", from);
  if (!error) {
    console.log(`Fixed designer slug: ${from} → ${to}`);
    fixed++;
  } else {
    console.log(`Failed ${from}: ${error.message}`);
  }
}

console.log(`Alias fixes applied: ${fixed}`);
