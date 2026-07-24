import { NextRequest, NextResponse } from "next/server";
import { getHqSession } from "../../../../lib/dashboard/auth";
import { getServerSupabase } from "../../../../lib/supabase-service-client";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getHqSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ message: "DB unavailable" }, { status: 503 });

  const { data, error } = await supabase
    .from("hq_campaigns")
    .select("*")
    .eq("workspace_id", session.workspaceId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ campaigns: data || [] });
}

export async function POST(request: NextRequest) {
  const session = await getHqSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ message: "DB unavailable" }, { status: 503 });

  const body = await request.json();
  const name = String(body.name || "").trim();
  if (!name) return NextResponse.json({ message: "Name is required" }, { status: 400 });

  const row = {
    workspace_id: session.workspaceId,
    name,
    status: body.status || "draft",
    objective: body.objective || null,
    channel: body.channel || null,
    start_date: body.startDate || null,
    end_date: body.endDate || null,
    budget: body.budget != null && body.budget !== "" ? Number(body.budget) : null,
    audience: body.audience || null,
    landing_page: body.landingPage || null,
    utm_source: body.utmSource || null,
    utm_medium: body.utmMedium || null,
    utm_campaign: body.utmCampaign || body.name || null,
    utm_content: body.utmContent || null,
    utm_term: body.utmTerm || null,
    owner_internal_user_id: session.internalUserId,
    notes: body.notes || null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from("hq_campaigns").insert(row).select("*").maybeSingle();
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ campaign: data });
}
