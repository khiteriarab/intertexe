import { NextResponse } from "next/server";
import { isCatalogTaxonomyNavEnabled } from "../../../../lib/catalog-taxonomy-flags";

export const revalidate = 60;

/** Remote kill switch for taxonomy Shop hub navigation. */
export async function GET() {
  const navEnabled = isCatalogTaxonomyNavEnabled();

  return NextResponse.json(
    {
      taxonomyNavEnabled: navEnabled,
      taxonomyNavKillSwitch: !navEnabled,
      fetchedAt: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    }
  );
}
