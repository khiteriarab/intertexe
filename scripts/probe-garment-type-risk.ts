import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { SHOP_CATEGORY_GARMENT_TYPES } from "../lib/catalog-shop-mappings";
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

const categories = Object.keys(SHOP_CATEGORY_GARMENT_TYPES).filter(
  (c) => !["apparel", "clothing", "shoes", "bags"].includes(c)
);

console.log("category | garment_types | gt_rows | displayable_gt | page_n | rpc");
for (const c of categories) {
  const types = SHOP_CATEGORY_GARMENT_TYPES[c] || [];
  let gtRows: number | null = null;
  let displayable: number | null = null;
  if (types.length) {
    const { count } = await sb
      .from("products")
      .select("id", { count: "exact", head: true })
      .in("garment_type", types);
    gtRows = count;
    const { count: d } = await sb
      .from("products")
      .select("id", { count: "exact", head: true })
      .in("garment_type", types)
      .eq("is_displayable", true);
    displayable = d;
  }
  const t0 = Date.now();
  const page = await queryLiveCatalog({
    region: "us",
    category: c,
    limit: 6,
    offset: 0,
    skipCount: true,
  });
  const risk =
    (gtRows === 0 || displayable === 0) && page.products.length <= 2
      ? "RISK"
      : page.products.length === 0
        ? "EMPTY"
        : "OK";
  console.log(
    `${risk.padEnd(5)} ${c.padEnd(14)} gt=[${types.join(",")}] rows=${String(gtRows).padStart(6)} disp=${String(displayable).padStart(6)} page=${page.products.length} rpc=${page.rpcVersion ?? "?"} ms=${Date.now() - t0}`
  );
}

// Production still empty?
const r = await fetch(
  "https://www.intertexe.com/api/shop?category=matching-sets&limit=6&region=us",
  { signal: AbortSignal.timeout(20000) }
);
const j = await r.json();
console.log("\nPROD matching-sets page=", j.products?.length, "total=", j.total);
