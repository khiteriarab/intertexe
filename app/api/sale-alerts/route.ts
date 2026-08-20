export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "../../../lib/auth-helpers";
import { saleAlertContextFromBody } from "../../../lib/sale-alerts";
import { getServerSupabase } from "../../../lib/supabase-server";

export async function GET(req: NextRequest) {
  const user = await getUserFromToken(req.headers.get("authorization"));
  if (!user) return NextResponse.json({ enabled: false }, { status: 401 });

  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ enabled: false }, { status: 500 });

  const { data } = await supabase
    .from("user_preferences")
    .select("sale_alerts_enabled")
    .eq("user_id", String(user.id))
    .maybeSingle();

  return NextResponse.json({ enabled: Boolean(data?.sale_alerts_enabled) });
}

export async function POST(req: NextRequest) {
  const user = await getUserFromToken(req.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ error: "Database not available" }, { status: 500 });

  const enabled = body.enabled !== false && body.enabled !== "false";
  const userId = String(user.id);
  const source = String(body.source || "chrome_extension").slice(0, 64);
  const row: Record<string, unknown> = {
    user_id: userId,
    sale_alerts_enabled: enabled,
    updated_at: new Date().toISOString(),
  };

  if (enabled) {
    row.sale_alerts_activated_at = new Date().toISOString();
    row.sale_alerts_source = source;
    const context = saleAlertContextFromBody(body);
    if (context) row.sale_alert_context = context;
  }

  const { error } = await supabase.from("user_preferences").upsert(row, { onConflict: "user_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ enabled });
}
