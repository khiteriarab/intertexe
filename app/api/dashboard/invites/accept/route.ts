import { NextRequest, NextResponse } from "next/server";
import { getHqSession } from "../../../../../lib/dashboard/auth";
import { getServerSupabase } from "../../../../../lib/supabase-service-client";

export const dynamic = "force-dynamic";

/** Accept a workspace invite after login (token from invite link). */
export async function POST(request: NextRequest) {
  const session = await getHqSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ message: "DB unavailable" }, { status: 503 });

  const body = await request.json();
  const token = String(body.token || "").trim();
  if (!token) return NextResponse.json({ message: "token required" }, { status: 400 });

  const { data: invite } = await supabase
    .from("hq_workspace_invites")
    .select("*")
    .eq("token", token)
    .eq("status", "pending")
    .maybeSingle();

  if (!invite) return NextResponse.json({ message: "Invite not found" }, { status: 404 });
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    await supabase.from("hq_workspace_invites").update({ status: "expired" }).eq("id", invite.id);
    return NextResponse.json({ message: "Invite expired" }, { status: 410 });
  }
  if (invite.email.toLowerCase() !== session.email.toLowerCase()) {
    return NextResponse.json({ message: "Invite email does not match signed-in user" }, { status: 403 });
  }

  const { data: membership, error: memErr } = await supabase
    .from("hq_internal_users")
    .upsert(
      {
        auth_user_id: session.authUserId,
        workspace_id: invite.workspace_id,
        email: session.email,
        full_name: session.fullName,
        is_active: true,
        is_primary: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id,auth_user_id" }
    )
    .select("id")
    .maybeSingle();

  if (memErr || !membership) {
    return NextResponse.json({ message: memErr?.message || "Membership failed" }, { status: 500 });
  }

  const { data: role } = await supabase
    .from("hq_roles")
    .select("id")
    .eq("key", invite.role_key)
    .maybeSingle();
  if (role?.id) {
    await supabase.from("hq_internal_user_roles").upsert(
      { internal_user_id: membership.id, role_id: role.id },
      { onConflict: "internal_user_id,role_id" }
    );
  }

  await supabase
    .from("hq_workspace_invites")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  return NextResponse.json({ ok: true, workspaceId: invite.workspace_id, membershipId: membership.id });
}
