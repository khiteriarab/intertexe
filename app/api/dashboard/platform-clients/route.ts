import { NextRequest, NextResponse } from "next/server";
import { getHqSession } from "../../../../lib/dashboard/auth";
import { getServerSupabase } from "../../../../lib/supabase-service-client";
import crypto from "node:crypto";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getHqSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!session.roles.some((r) => ["founder", "admin", "partnerships"].includes(r))) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ message: "DB unavailable" }, { status: 503 });

  let query = supabase
    .from("platform_clients")
    .select(
      "id, name, company, email, api_key, plan, monthly_limit, calls_this_month, is_active, notes, workspace_id, created_at, last_active_at"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  // Client workspaces only see their own keys; INTERTEXE sees all
  if (session.workspaceSlug !== "intertexe") {
    query = query.eq("workspace_id", session.workspaceId);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ clients: data || [] });
}

export async function POST(request: NextRequest) {
  const session = await getHqSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!session.roles.some((r) => ["founder", "admin", "partnerships"].includes(r))) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ message: "DB unavailable" }, { status: 503 });

  const body = await request.json();
  const name = String(body.name || "").trim();
  const email = String(body.email || "")
    .trim()
    .toLowerCase();
  if (!name || !email) {
    return NextResponse.json({ message: "name and email required" }, { status: 400 });
  }

  const apiKey = `itx_${crypto.randomBytes(18).toString("hex")}`;
  const { data, error } = await supabase
    .from("platform_clients")
    .insert({
      name,
      company: body.company || null,
      email,
      api_key: apiKey,
      plan: body.plan || "starter",
      monthly_limit: body.monthlyLimit != null ? Number(body.monthlyLimit) : 1000,
      notes: body.notes || null,
      workspace_id: session.workspaceId,
      is_active: true,
    })
    .select(
      "id, name, company, email, api_key, plan, monthly_limit, calls_this_month, is_active, workspace_id, created_at"
    )
    .maybeSingle();

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ client: data });
}
