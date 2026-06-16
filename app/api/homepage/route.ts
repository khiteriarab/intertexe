import { NextResponse } from "next/server";
import { getCachedHomePageData } from "../../../lib/homepage-data";
import {
  HOMEPAGE_CACHE_HEADERS,
} from "../../../lib/homepage-cache-config";

export const revalidate = 3600; // HOMEPAGE_REVALIDATE_SEC — must be literal for Next.js route config

export async function GET() {
  try {
    const data = await getCachedHomePageData();
    return NextResponse.json(data, {
      headers: HOMEPAGE_CACHE_HEADERS,
    });
  } catch (error) {
    console.error("[api/homepage]", error);
    return NextResponse.json({ error: "Failed to fetch homepage data" }, { status: 500 });
  }
}
