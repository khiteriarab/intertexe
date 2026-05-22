/**
 * Apply refresh_homepage_feeds_v2 via service role (run after migration 20240018).
 * npx tsx scripts/run-merch-refresh.ts
 */
import { createClient } from "@supabase/supabase-js";

async function main() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) throw new Error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");

  const supabase = createClient(url, key);
  console.log("Calling refresh_homepage_feeds_v2...");
  const { data, error } = await supabase.rpc("refresh_homepage_feeds_v2", {
    p_preferred_region: "us",
  });
  if (error) {
    console.error("refresh error:", error.message);
    process.exit(1);
  }
  console.log(JSON.stringify(data, null, 2));

  const keys = [
    "top:new_in",
    "fabrics:silk",
    "fabrics:linen",
    "fabrics:cashmere",
    "fabrics:wool",
    "fabrics:cotton",
    "collections:vacation",
    "sale:all",
  ];
  for (const k of keys) {
    const { count } = await supabase
      .from("homepage_feed_items")
      .select("rail_key", { count: "exact", head: true })
      .eq("rail_key", k);
    const { data: meta } = await supabase
      .from("homepage_feed_meta")
      .select("row_count, source_rows, display_count, last_error")
      .eq("rail_key", k)
      .maybeSingle();
    console.log(k, "items:", count, "meta:", meta);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
