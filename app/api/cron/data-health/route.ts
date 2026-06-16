export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-service-client";
import { LIVE_CATALOG_TABLE } from "@/lib/global-catalog-scope";
import { COLLECTION_CANONICAL_SLUGS } from "@/lib/catalog-direct-query";
import { fetchCatalogHealthSnapshot } from "@/lib/catalog-daily-report";

const COLLECTION_SLUGS = [
  "vacation",
  "evening",
  "tailoring",
  "summer-in-the-city",
  "white-edit",
] as const;

function authorize(request: Request): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET || process.env.FEED_SYNC_SECRET;
  if (!cronSecret) return null;
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function GET(request: Request) {
  const denied = authorize(request);
  if (denied) return denied;

  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ healthy: false, error: "Missing Supabase env" }, { status: 500 });
  }

  const issues: string[] = [];

  const { count: totalUS } = await supabase
    .from(LIVE_CATALOG_TABLE)
    .select("*", { count: "exact", head: true })
    .eq("region", "us");

  const { count: colorCount } = await supabase
    .from(LIVE_CATALOG_TABLE)
    .select("*", { count: "exact", head: true })
    .eq("region", "us")
    .not("color", "is", null);

  const colorPct = Math.round(((colorCount || 0) * 100) / (totalUS || 1));
  if (colorPct < 80) issues.push(`Color coverage low: ${colorPct}%`);

  const collectionCounts: Record<string, number> = {};
  for (const slug of COLLECTION_SLUGS) {
    const canonical = COLLECTION_CANONICAL_SLUGS[slug] || [slug];
    let countQuery = supabase
      .from(LIVE_CATALOG_TABLE)
      .select("*", { count: "exact", head: true })
      .eq("region", "us");

    if (slug === "white-edit") {
      const orParts = canonical.map((s) => `collection_slugs.cs.{${s}}`);
      orParts.push("color.in.(white,ivory,cream,ecru,off-white)");
      countQuery = countQuery.or(orParts.join(","));
    } else {
      countQuery = countQuery.overlaps("collection_slugs", canonical);
    }

    const { count } = await countQuery;
    collectionCounts[slug] = count || 0;
    if ((count || 0) < 100) {
      issues.push(`Collection ${slug} low: ${count} products`);
    }
  }

  const { count: garmentCount } = await supabase
    .from(LIVE_CATALOG_TABLE)
    .select("*", { count: "exact", head: true })
    .eq("region", "us")
    .not("garment_type", "is", null);

  const garmentPct = Math.round(((garmentCount || 0) * 100) / (totalUS || 1));
  if (garmentPct < 95) issues.push(`Garment type coverage low: ${garmentPct}%`);

  const snapshot = await fetchCatalogHealthSnapshot(supabase);

  if (snapshot.shouldBeLiveCount > 0) {
    issues.push(`${snapshot.shouldBeLiveCount} products should be live but are not approved`);
  }
  if (snapshot.brandsAffected > 0) {
    issues.push(`${snapshot.brandsAffected} brands have pending high-NFP products`);
  }

  if (issues.length > 0) {
    console.error("DATA HEALTH ISSUES:", issues);
  }

  return NextResponse.json({
    healthy: issues.length === 0,
    issues,
    checked_at: new Date().toISOString(),
    email_sent: false,
    brand_health: {
      should_be_live: snapshot.shouldBeLiveCount,
      brands_affected: snapshot.brandsAffected,
    },
    metrics: {
      total_us: totalUS,
      color_pct: colorPct,
      garment_type_pct: garmentPct,
      collections: collectionCounts,
    },
  });
}
