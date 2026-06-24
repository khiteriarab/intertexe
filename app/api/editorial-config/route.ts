import { NextResponse } from "next/server";
import { buildCollectionsManifest } from "../../../lib/collections-manifest";
import {
  BRAND_WE_LOVE_IMAGES,
  EDITORIAL_HERO,
  HOMEPAGE_HERO_IMAGE_DESKTOP,
  HOMEPAGE_HERO_IMAGE_MOBILE,
} from "../../../lib/editorial-assets";
import { fabricImages } from "../../../lib/fabric-images";
import { PROMO_MESSAGES } from "../../../lib/promo-messages";

export const revalidate = 300;

/** Remote editorial + fabric cover URLs for iOS/web clients (update without app release). */
export async function GET() {
  return NextResponse.json(
    {
      version: 1,
      updatedAt: new Date().toISOString(),
      heroes: EDITORIAL_HERO,
      fabrics: fabricImages,
      brands: BRAND_WE_LOVE_IMAGES,
      homepageHeroMobile: HOMEPAGE_HERO_IMAGE_MOBILE,
      homepageHeroDesktop: HOMEPAGE_HERO_IMAGE_DESKTOP,
      collections: buildCollectionsManifest(),
      promoMessages: [...PROMO_MESSAGES],
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    }
  );
}
