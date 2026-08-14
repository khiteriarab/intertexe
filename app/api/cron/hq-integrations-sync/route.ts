import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "../../../../lib/supabase-service-client";
import { syncProvider } from "../../../../lib/dashboard/integrations/connections";
import type { OAuthProviderId } from "../../../../lib/dashboard/integrations/types";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const PROVIDERS: OAuthProviderId[] = [
  "google",
  "gmail",
  "meta",
  "tiktok",
  "pinterest",
  "app_store_connect",
];

/**
 * Nightly pull for all connected HQ integrations.
 * Secure with Authorization: Bearer $CRON_SECRET
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization") || "";
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ message: "DB unavailable" }, { status: 503 });

  const { data: connections } = await supabase
    .from("hq_oauth_connections")
    .select("workspace_id, provider, status")
    .in("status", ["connected", "degraded"]);

  const results: Array<Record<string, unknown>> = [];
  for (const row of connections || []) {
    if (!PROVIDERS.includes(row.provider as OAuthProviderId)) continue;
    const out = await syncProvider(
      supabase,
      row.workspace_id,
      row.provider as OAuthProviderId
    );
    results.push({
      workspaceId: row.workspace_id,
      provider: row.provider,
      ...out,
    });
  }

  return NextResponse.json({
    ok: true,
    synced: results.length,
    results,
  });
}
