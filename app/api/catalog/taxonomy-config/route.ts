import { NextResponse } from "next/server";

export const revalidate = 60;

/** Remote kill switch for taxonomy Shop hub navigation. Default false — do not enable until QA sign-off. */
export async function GET() {
  const navEnabled =
    process.env.CATALOG_TAXONOMY_NAV === "1" ||
    process.env.CATALOG_TAXONOMY_NAV === "true";

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
