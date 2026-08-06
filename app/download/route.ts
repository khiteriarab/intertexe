import { NextResponse } from "next/server";
import { resolveStoreDestination } from "../../lib/app-store";

/**
 * Same-origin /download → App Store.
 * CTAs only link here so TikTok never sees apps.apple.com on /khiteri.
 */
export function GET() {
  return NextResponse.redirect(resolveStoreDestination(), 302);
}
