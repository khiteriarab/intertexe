/**
 * Take a row-level catalog snapshot (pre-promote / scheduled LKG).
 * Auth: Bearer $CRON_SECRET
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-service-client";
import { takeCatalogSnapshot } from "@/lib/catalog-snapshot";
import { expensiveJobSkipBody, expensiveJobsEnabled } from "@/lib/job-guard";

function authorize(request: Request): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET || process.env.FEED_SYNC_SECRET;
  if (!cronSecret) return null;
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function GET(request: Request) {
  const denied = authorize(request);
  if (denied) return denied;

  if (!expensiveJobsEnabled()) {
    return NextResponse.json(expensiveJobSkipBody());
  }

  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Missing Supabase env" }, { status: 500 });
  }

  const url = new URL(request.url);
  const source = url.searchParams.get("source") || "scheduled";
  const note = url.searchParams.get("note") || "cron catalog-snapshot";

  try {
    const header = await takeCatalogSnapshot(supabase, source, note);
    return NextResponse.json({ ok: true, ...header });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
