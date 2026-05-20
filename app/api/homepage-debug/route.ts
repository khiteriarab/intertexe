export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getHomePageData } from "../../../lib/homepage-data";

/** Temporary: hit /api/homepage-debug on preview to mirror [homepage-rail] logs in Vercel. */
export async function GET() {
  try {
    const data = await getHomePageData();
    return NextResponse.json({
      counts: {
        newIn: data.newInProducts.length,
        silk: data.silkProducts.length,
        cashmere: data.cashmereProducts.length,
        linen: data.linenProducts.length,
        vacation: data.vacationProducts.length,
        sale: data.saleProducts.length,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "debug failed" }, { status: 500 });
  }
}
