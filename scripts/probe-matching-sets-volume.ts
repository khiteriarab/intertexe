import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

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

async function count(label: string, q: () => any) {
  const { count, error } = await q();
  console.log(`${label}: ${count ?? "null"} ${error?.message ?? ""}`.trim());
}

await count("garment_type=matching_sets", () =>
  sb.from("products").select("id", { count: "exact", head: true }).eq("garment_type", "matching_sets")
);
await count("matching_sets + displayable", () =>
  sb
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("garment_type", "matching_sets")
    .eq("is_displayable", true)
);
await count("matching_sets + approved yes", () =>
  sb
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("garment_type", "matching_sets")
    .eq("approved", "yes")
);
await count("matching_sets + nfp>=80", () =>
  sb
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("garment_type", "matching_sets")
    .gte("natural_fiber_percent", 80)
);
await count("matching_sets + displayable + nfp>=80", () =>
  sb
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("garment_type", "matching_sets")
    .eq("is_displayable", true)
    .gte("natural_fiber_percent", 80)
);
await count("name ilike two piece + displayable", () =>
  sb
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("is_displayable", true)
    .or("name.ilike.%two piece%,name.ilike.%two-piece%,name.ilike.%matching set%,name.ilike.%co-ord%,name.ilike.%coord%")
);
await count("live_products apparel matching_sets", () =>
  sb
    .from("live_products_apparel")
    .select("id", { count: "exact", head: true })
    .eq("garment_type", "matching_sets")
);
await count("live_products name matching keywords", () =>
  sb
    .from("live_products_apparel")
    .select("id", { count: "exact", head: true })
    .or(
      "name.ilike.%two piece%,name.ilike.%two-piece%,name.ilike.%matching set%,name.ilike.%co-ord%,name.ilike.%coord%,category.ilike.%matching set%,category.ilike.%co-ord%"
    )
);

const { data: sample } = await sb
  .from("live_products_apparel")
  .select("id,name,category,garment_type,natural_fiber_percent,is_displayable,stock_status")
  .or(
    "name.ilike.%two piece%,name.ilike.%two-piece%,name.ilike.%matching set%,name.ilike.%co-ord%,garment_type.eq.matching_sets"
  )
  .limit(15);
console.log("sample", JSON.stringify(sample, null, 2));

// Production API (still old deploy?)
const t0 = Date.now();
try {
  const r = await fetch(
    "https://www.intertexe.com/api/shop?category=matching-sets&limit=12&offset=0&region=us",
    { signal: AbortSignal.timeout(25000) }
  );
  const j = await r.json();
  console.log(
    "PROD api matching-sets n=",
    j.products?.length,
    "total=",
    j.total,
    "err=",
    j.error,
    "ms=",
    Date.now() - t0
  );
  if (j.products?.[0]) console.log("first", j.products[0].name, j.products[0].naturalFiberPercent);
} catch (e: any) {
  console.log("PROD FAIL", e.message, "ms=", Date.now() - t0);
}
