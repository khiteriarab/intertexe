import { NextResponse } from "next/server";
import { getCachedHomePageData } from "../../../lib/homepage-data";
import {
  HOMEPAGE_CACHE_HEADERS,
  HOMEPAGE_REVALIDATE_SEC,
} from "../../../lib/homepage-cache-config";

export const revalidate = HOMEPAGE_REVALIDATE_SEC;

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
