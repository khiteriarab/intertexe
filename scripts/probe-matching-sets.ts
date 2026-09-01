import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { queryLiveCatalog } from "../lib/catalog-direct-query";
import { productMatchesHardCategory } from "../lib/catalog-shop-mappings";

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

const page = await queryLiveCatalog({
  region: "us",
  category: "matching-sets",
  limit: 24,
  offset: 0,
  skipCount: true,
});
console.log("queryLiveCatalog n=", page.products.length, "rpc=", page.rpcVersion, "err=", page.error);
for (const p of page.products) {
  console.log(
    "PAGE",
    JSON.stringify({
      id: p.id,
      name: p.name,
      brand: p.brandName,
      nfp: p.naturalFiberPercent,
      stock: p.stockStatus,
      category: p.category,
      composition: (p.composition || "").slice(0, 100),
    })
  );
}

const { data: list, error } = await sb.rpc("catalog_list", {
  p_preferred_region: "us",
  p_fallback_region: "us",
  p_fiber: null,
  p_category: "matching-sets",
  p_brand_slug: null,
  p_search: null,
  p_min_nfp: 80,
  p_limit: 24,
  p_offset: 0,
});
if (error) console.log("list ERR", error.message);
console.log("catalog_list n=", list?.length);
for (const r of list || []) {
  const hard = productMatchesHardCategory(
    {
      name: r.name,
      category: r.category,
      garment_type: r.garment_type,
      composition: r.composition,
    },
    "matching-sets"
  );
  console.log(
    "LIST",
    JSON.stringify({
      id: r.id,
      name: r.name,
      nfp: r.natural_fiber_percent,
      stock: r.stock_status,
      gt: r.garment_type,
      category: r.category,
      hard,
      composition: (r.composition || "").slice(0, 100),
      image: !!r.image_url,
    })
  );
}

const { data: count } = await sb.rpc("catalog_list_count", {
  p_preferred_region: "us",
  p_fallback_region: "us",
  p_fiber: null,
  p_category: "matching-sets",
  p_brand_slug: null,
  p_search: null,
  p_min_nfp: 80,
});
console.log("count=", count);

const { data: v2 } = await sb.rpc("catalog_browse_page_v2", {
  p_region: "us",
  p_category: "matching-sets",
  p_material_family: null,
  p_material_subtype: null,
  p_fabric_construction: null,
  p_min_nfp: null,
  p_max_synthetic: null,
  p_color: null,
  p_brand_slug: null,
  p_search: null,
  p_min_price: null,
  p_max_price: null,
  p_include_unverified: false,
  p_sort: "newest",
  p_limit: 24,
  p_offset: 0,
});
console.log(
  "v2 n=",
  v2?.products?.length,
  "empty=",
  v2?.empty_reason,
  "total=",
  v2?.total,
  "verified=",
  v2?.verified_total
);
