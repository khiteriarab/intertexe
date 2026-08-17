import { NextRequest, NextResponse } from "next/server";
import { getHqSession } from "../../../../lib/dashboard/auth";
import { getServerSupabase } from "../../../../lib/supabase-service-client";

export const dynamic = "force-dynamic";

function numOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export async function POST(request: NextRequest) {
  const session = await getHqSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!session.roles.some((r) => ["founder", "admin"].includes(r))) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ message: "DB unavailable" }, { status: 503 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const followerCount = numOrNull(body.followerCount);
  if (followerCount == null) {
    return NextResponse.json({ message: "Enter today’s follower count from TikTok Analytics." }, { status: 400 });
  }

  const views7d = numOrNull(body.views7d);
  const likes7d = numOrNull(body.likes7d);
  const videosPosted7d = numOrNull(body.videosPosted7d);
  const username = String(body.username || "intertexe")
    .replace(/^@/, "")
    .trim()
    .slice(0, 64) || "intertexe";
  const metricDate =
    typeof body.metricDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.metricDate)
      ? body.metricDate
      : new Date().toISOString().slice(0, 10);

  const { data: existing } = await supabase
    .from("hq_integration_metric_snapshots")
    .select("metrics, raw")
    .eq("workspace_id", session.workspaceId)
    .eq("provider", "tiktok")
    .eq("metric_date", metricDate)
    .maybeSingle();

  const prior = (existing?.metrics || {}) as Record<string, unknown>;
  const priorRaw = (existing?.raw && typeof existing.raw === "object" ? existing.raw : {}) as Record<
    string,
    unknown
  >;
  const nowIso = new Date().toISOString();
  const metrics = {
    ...prior,
    syncedAt: nowIso,
    apiSurface: "tiktok_analytics_manual",
    username,
    displayName: prior.displayName || "INTERTEXE",
    followerCount,
    viewsSample: views7d,
    views7d,
    likesSample: likes7d,
    likes7d,
    videosPosted7d,
    statsScopeMissing: false,
    tiktokUserError: null,
    extensions: {
      ...(typeof prior.extensions === "object" && prior.extensions ? prior.extensions : {}),
      source: "tiktok_analytics_manual",
      note: "Logged from TikTok Analytics. Login Kit is not used (internal dashboards are not approved).",
    },
  };

  const { error } = await supabase.from("hq_integration_metric_snapshots").upsert(
    {
      workspace_id: session.workspaceId,
      provider: "tiktok",
      metric_date: metricDate,
      metrics,
      raw: { ...priorRaw, organicLog: { loggedAt: nowIso, loggedBy: session.email } },
    },
    { onConflict: "workspace_id,provider,metric_date" }
  );

  if (error) {
    return NextResponse.json({ message: error.message || "Could not save TikTok log" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, metricDate, followerCount, views7d });
}
