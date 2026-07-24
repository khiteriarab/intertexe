import { NextRequest, NextResponse } from "next/server";
import { pullRakutenRevenueReports } from "../../../../lib/dashboard/rakuten-revenue-ftp";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Auto-pull Rakuten revenue via Reporting API (preferred) or FTP report CSVs.
 * Auth: Authorization: Bearer $CRON_SECRET
 * Optional: ?dryRun=1
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization") || "";
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const dryRun = request.nextUrl.searchParams.get("dryRun") === "1";
  try {
    const result = await pullRakutenRevenueReports({ dryRun, maxFiles: 5 });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || "Pull failed" }, { status: 500 });
  }
}
