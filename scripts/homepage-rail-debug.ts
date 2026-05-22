/**
 * Run: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/homepage-rail-debug.ts
 * Prints [homepage-rail] style counts for each pipeline step (no deploy needed).
 */
import {
  fetchHomepageMaterialRailsPool,
  buildHomepageMaterialRailsFromPool,
  fetchHomepageNewInRailProducts,
  getServerSupabase,
} from "../lib/supabase-server";
import { CURATED_BRAND_SLUGS } from "../lib/homepage-constants";

const NEW_IN_BRANDS = [
  "frame", "vince", "theory", "toteme", "ganni", "staud", "khaite", "isabel-marant",
];
const HOMEPAGE_BRAND_SLUGS = [...new Set([...NEW_IN_BRANDS, ...CURATED_BRAND_SLUGS])];

async function main() {
  const client = getServerSupabase();
  console.log("[homepage-rail] debug: supabase client", client ? "ok" : "MISSING");

  const pool = await fetchHomepageMaterialRailsPool(HOMEPAGE_BRAND_SLUGS, 96);
  const split = buildHomepageMaterialRailsFromPool(pool, 24);
  const saleRows = pool.filter((r: any) => r.is_sale === true);
  console.log("[homepage-rail] split counts", {
    silk: split.silk.length,
    cashmere: split.cashmere.length,
    linen: split.linen.length,
    vacation: split.vacation.length,
    saleRaw: saleRows.length,
  });

  const newIn = await fetchHomepageNewInRailProducts(NEW_IN_BRANDS, 32);
  console.log("[homepage-rail] direct fetch counts", { "new-in": newIn.length });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
