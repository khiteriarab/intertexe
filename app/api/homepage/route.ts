import { NextResponse } from "next/server";
import { getHomePageData } from "../../../lib/homepage-data";

export async function GET() {
  try {
    const data = await getHomePageData();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch homepage data" }, { status: 500 });
  }
}
