import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { queryLiveCatalog } from "../lib/catalog-direct-query";

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq);
    if (process.env[key]) continue;
    let val = trimmed.slice(eq + 1);
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

loadEnvFile(".env.development.local");
loadEnvFile(".env.local");

const sb = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

const categories = [
  "clothing",
  "dresses",
  "tops",
  "shirts",
  "blouses",
  "tanks",
  "knitwear",
  "outerwear",
  "coats",
  "jackets",
  "trousers",
  "jeans",
  "shorts",
  "skirts",
  "swimwear",
  "lingerie",
  "sleepwear",
  "jumpsuits",
  "matching-sets",
];
const fibers = ["silk", "linen", "cotton", "wool", "cashmere", "leather"];

async function count(category?: string | null, fiber?: string | null) {
  const { data, error } = await sb.rpc("catalog_list_count", {
    p_preferred_region: "us",
    p_fallback_region: "us",
    p_fiber: fiber ?? null,
    p_category: category ?? null,
    p_brand_slug: null,
    p_search: null,
    p_min_nfp: 80,
  });
  if (error) return { n: null as number | null, err: error.message };
  return { n: Number(data), err: null as string | null };
}

console.log("=== matching-sets page ===");
{
  const t0 = Date.now();
  const page = await queryLiveCatalog({
    region: "us",
    category: "matching-sets",
    limit: 24,
    offset: 0,
    skipCount: true,
  });
  console.log(
    `n=${page.products.length} rpc=${page.rpcVersion} err=${page.error ?? ""} ms=${Date.now() - t0}`
  );
  for (const p of page.products.slice(0, 12)) {
    console.log(` - ${p.naturalFiberPercent}% ${p.name}`);
  }
}

console.log("\n=== category counts (catalog_list_count) ===");
for (const c of categories) {
  const t0 = Date.now();
  const { n, err } = await count(c === "clothing" ? null : c, null);
  const flag = n != null && n > 0 ? "OK" : "EMPTY";
  console.log(`${flag} ${c.padEnd(14)} count=${String(n ?? "?").padStart(6)} ms=${Date.now() - t0}${err ? " " + err : ""}`);
}

console.log("\n=== fiber counts ===");
for (const f of fibers) {
  const t0 = Date.now();
  const { n, err } = await count(null, f);
  const flag = n != null && n > 0 ? "OK" : "EMPTY";
  console.log(`${flag} ${f.padEnd(14)} count=${String(n ?? "?").padStart(6)} ms=${Date.now() - t0}${err ? " " + err : ""}`);
}
