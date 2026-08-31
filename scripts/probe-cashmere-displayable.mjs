#!/usr/bin/env node
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

function load(f) {
  if (!fs.existsSync(f)) return;
  for (const line of fs.readFileSync(f, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    const k = t.slice(0, i);
    if (process.env[k]) continue;
    let v = t.slice(i + 1);
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    process.env[k] = v;
  }
}
load(".env.development.local");
load(".env.local");

const sb = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

async function main() {
  const { data: apiIds } = await sb
    .from("products")
    .select("id,is_displayable,fiber_primary,shop_material_family,natural_fiber_percent")
    .eq("is_displayable", true)
    .or("fiber_primary.ilike.%cashmere%,shop_material_family.ilike.%cashmere%")
    .limit(5);
  console.log("displayable cashmere sample:", JSON.stringify(apiIds));

  const { count: hidden } = await sb
    .from("products")
    .select("id", { count: "estimated", head: true })
    .eq("is_displayable", false)
    .gte("natural_fiber_percent", 80)
    .eq("approved", "yes");
  console.log("approved nfp>=80 but not displayable (est):", hidden);
}

main().catch(console.error);
