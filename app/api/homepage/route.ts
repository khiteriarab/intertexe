import { NextResponse } from "next/server";
import { getCachedHomePageData } from "../../../lib/homepage-data";
import {
  HOMEPAGE_CACHE_HEADERS,
} from "../../../lib/homepage-cache-config";

/** Must be a literal — Next.js does not accept imported segment config values. */
export const revalidate = 3600;

export async function GET() {
  try {
    const data = await getCachedHomePageData();
    return NextResponse.json(data, {
      headers: HOMEPAGE_CACHE_HEADERS,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch homepage data" }, { status: 500 });
  }
}
