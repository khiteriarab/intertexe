import { NextResponse } from "next/server";
import { DEFAULT_APP_STORE_URL, getAppStoreUrl } from "../../lib/app-store";

/** Legacy /download bookmarks → App Store. */
export function GET() {
  return NextResponse.redirect(getAppStoreUrl() || DEFAULT_APP_STORE_URL, 302);
}
