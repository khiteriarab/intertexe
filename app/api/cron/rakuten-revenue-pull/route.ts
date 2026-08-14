import { NextRequest, NextResponse } from "next/server";
import { pullRakutenRevenueReports } from "../../../../lib/dashboard/rakuten-revenue-ftp";
import {
  expensiveJobSkipBody,
  expensiveJobsEnabled,
  recordJobObservation,
  withJobLock,
} from "@/lib/job-guard";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Auto-pull Rakuten revenue via Reporting API (preferred) or FTP report CSVs.
 * Auth: Authorization: Bearer $CRON_SECRET
 * Optional: ?dryRun=1
 *
 * Capped + locked: FTP waits bill Fluid Provisioned Memory for the whole hang.
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization") || "";
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!expensiveJobsEnabled()) {
    return NextResponse.json(expensiveJobSkipBody());
  }

  const dryRun = request.nextUrl.searchParams.get("dryRun") === "1";
  const startedAt = new Date().toISOString();
  const locked = await withJobLock("rakuten-revenue-pull", 70_000, async () => {
    return pullRakutenRevenueReports({ dryRun, maxFiles: 3 });
  });

  if (!locked.ok) {
    await recordJobObservation({
      job: "rakuten-revenue-pull",
      startedAt,
      ok: false,
      skipped: true,
      detail: locked.body,
    });
    return NextResponse.json(locked.body, { status: locked.status });
  }

  await recordJobObservation({
    job: "rakuten-revenue-pull",
    startedAt,
    ok: true,
    detail: { dryRun },
  });
  return NextResponse.json(locked.result);
}
