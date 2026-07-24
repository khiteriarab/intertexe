import { NextRequest, NextResponse } from "next/server";
import { getHqSession } from "../../../../lib/dashboard/auth";
import { getServerSupabase } from "../../../../lib/supabase-service-client";
import crypto from "node:crypto";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getHqSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ message: "DB unavailable" }, { status: 503 });

  const { data: invites } = await supabase
    .from("hq_workspace_invites")
    .select("id, email, role_key, status, expires_at, created_at, token")
    .eq("workspace_id", session.workspaceId)
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: members } = await supabase
    .from("hq_internal_users")
    .select("id, email, full_name, is_active, last_login_at, created_at")
    .eq("workspace_id", session.workspaceId)
    .order("created_at", { ascending: true });

  return NextResponse.json({ invites: invites || [], members: members || [] });
}

export async function POST(request: NextRequest) {
  const session = await getHqSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!session.roles.some((r) => ["founder", "admin"].includes(r))) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ message: "DB unavailable" }, { status: 503 });

  const body = await request.json();
  const email = String(body.email || "")
    .trim()
    .toLowerCase();
  const roleKey = String(body.roleKey || "read_only");
  if (!email || !email.includes("@")) {
    return NextResponse.json({ message: "Valid email required" }, { status: 400 });
  }

  const token = crypto.randomBytes(24).toString("hex");
  const { data, error } = await supabase
    .from("hq_workspace_invites")
    .insert({
      workspace_id: session.workspaceId,
      email,
      role_key: roleKey,
      token,
      invited_by_internal_user_id: session.internalUserId,
      status: "pending",
    })
    .select("id, email, role_key, token, expires_at, status")
    .maybeSingle();

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  const acceptUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.intertexe.com"}/dashboard/login?invite=${data?.token}`;

  return NextResponse.json({ invite: data, acceptUrl });
}
