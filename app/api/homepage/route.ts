import { NextResponse } from "next/server";
import { getHomePageData } from "../../../lib/homepage-data";

export async function GET() {
  try {
    const data = await getHomePageData();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch homepage data" }, { status: 500 });
  }
}
