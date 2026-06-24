import { NextResponse } from "next/server";
import { buildHomepageMerchandisingManifest } from "../../../lib/homepage-merchandising-manifest";

export const revalidate = 300;

/** NAP-style homepage editorial feed manifest (rails, limits, section order). */
export async function GET() {
  return NextResponse.json(buildHomepageMerchandisingManifest(), {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
