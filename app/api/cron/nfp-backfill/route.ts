export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { NextResponse } from "next/server";
import {
  catalogBulkMutationsDisabledReason,
  catalogBulkMutationsEnabled,
} from "@/lib/catalog-bulk-mutations";
import { getServerSupabase } from "@/lib/supabase-service-client";

function authorize(request: Request): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET || process.env.FEED_SYNC_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/** Ops: batched NFP/composition repair. Disabled unless CATALOG_BULK_MUTATIONS_ENABLED=true. */
export async function GET(request: Request) {
  if (!catalogBulkMutationsEnabled()) {
    return NextResponse.json(
      { ok: false, disabled: true, error: catalogBulkMutationsDisabledReason() },
      { status: 403 }
    );
  }

  const denied = authorize(request);
  if (denied) return denied;

  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Missing Supabase env" }, { status: 500 });
  }

  const url = new URL(request.url);
  const rounds = Math.min(Number(url.searchParams.get("rounds") || 12), 40);
  const scanLimit = Math.min(Number(url.searchParams.get("scan") || 800), 2000);
  const fixLimit = Math.min(Number(url.searchParams.get("fix") || 400), 2000);
  let afterId =
    url.searchParams.get("afterId")?.trim() || "00000000-0000-0000-0000-000000000000";

  const log: { round: number; rowsUpdated: number; lastScannedId: string }[] = [];
  let totalUpdated = 0;
  const startedAt = Date.now();
  const hardStop = startedAt + 240_000;

  for (let round = 1; round <= rounds; round += 1) {
    if (Date.now() > hardStop) break;

    const { data, error } = await supabase.rpc("fix_synthetic_nfp_mismatch_id_batch", {
      p_after_id: afterId,
      p_scan_limit: scanLimit,
      p_fix_limit: fixLimit,
    });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message, afterId, totalUpdated, log },
        { status: 500 }
      );
    }

    const row = Array.isArray(data) ? data[0] : data;
    const rowsUpdated = Number((row as { rows_updated?: number })?.rows_updated ?? 0);
    const lastScannedId = String(
      (row as { last_scanned_id?: string })?.last_scanned_id ?? afterId
    );

    log.push({ round, rowsUpdated, lastScannedId });
    totalUpdated += rowsUpdated;

    if (!lastScannedId || lastScannedId === afterId) {
      afterId = "00000000-0000-0000-0000-000000000000";
      break;
    }

    afterId = lastScannedId;
  }

  let remaining: number | null = null;
  const { data: countData, error: countError } = await supabase.rpc("count_synthetic_nfp_mismatch");
  if (!countError) {
    remaining = Number(countData ?? 0);
  }

  return NextResponse.json({
    ok: true,
    totalUpdated,
    afterId,
    remaining,
    remainingCountError: countError?.message ?? null,
    log,
    elapsedMs: Date.now() - startedAt,
  });
}
