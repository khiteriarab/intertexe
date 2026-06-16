import { NextResponse } from "next/server";
import { getHomePageData } from "../../../lib/homepage-data";
export const revalidate = 300;

const PRODUCT_CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
  "CDN-Cache-Control": "public, max-age=300",
};

export async function GET() {
  try {
    const data = await getHomePageData();
    return NextResponse.json(data, {
      headers: PRODUCT_CACHE_HEADERS,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch homepage data" }, { status: 500 });
  }
}
