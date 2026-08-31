#!/usr/bin/env node
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq);
    if (process.env[key]) continue;
    let val = trimmed.slice(eq + 1);
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
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

const { count: displayable, error: dErr } = await sb
  .from("products")
  .select("id", { count: "estimated", head: true })
  .eq("is_displayable", true);
console.log("is_displayable=true (est):", displayable, dErr?.message || "");

const { count: notDisplayable, error: nErr } = await sb
  .from("products")
  .select("id", { count: "estimated", head: true })
  .eq("is_displayable", false);
console.log("is_displayable=false (est):", notDisplayable, nErr?.message || "");

const { data: sample, error: sErr } = await sb
  .from("products")
  .select("id,name,natural_fiber_percent,is_displayable,approved")
  .eq("approved", "yes")
  .gte("natural_fiber_percent", 80)
  .eq("is_displayable", false)
  .limit(3);
console.log("hidden-but-nfp>=80 sample:", sErr?.message || JSON.stringify(sample));

const { data: vis, error: vErr } = await sb
  .from("products")
  .select("id,name")
  .eq("is_displayable", true)
  .eq("region", "us")
  .limit(3);
console.log("visible sample:", vErr?.message || JSON.stringify(vis));
