import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  getHqSession,
  HQ_WORKSPACE_COOKIE,
  type HqRoleKey,
} from "../../../../lib/dashboard/auth";
import { getServerSupabase } from "../../../../lib/supabase-service-client";

export const dynamic = "force-dynamic";

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export async function GET() {
  const session = await getHqSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  return NextResponse.json({
    activeWorkspaceId: session.workspaceId,
    workspaces: session.workspaces,
  });
}

/** Switch active workspace cookie */
export async function PUT(request: NextRequest) {
  const session = await getHqSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const workspaceId = String(body.workspaceId || "");
  const allowed = session.workspaces.some((w) => w.id === workspaceId);
  if (!allowed) return NextResponse.json({ message: "Workspace not found" }, { status: 404 });

  const jar = await cookies();
  jar.set(HQ_WORKSPACE_COOKIE, workspaceId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });

  return NextResponse.json({ ok: true, workspaceId });
}

/** Create a client workspace (founder/admin) — SaaS activation */
export async function POST(request: NextRequest) {
  const session = await getHqSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!session.roles.some((r) => ["founder", "admin"].includes(r))) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ message: "DB unavailable" }, { status: 503 });

  const body = await request.json();
  const name = String(body.name || "").trim();
  if (!name) return NextResponse.json({ message: "name required" }, { status: 400 });
  const slug = slugify(String(body.slug || name));
  if (!slug) return NextResponse.json({ message: "invalid slug" }, { status: 400 });

  const { data: workspace, error } = await supabase
    .from("hq_workspaces")
    .insert({ slug, name, status: "active" })
    .select("id, slug, name")
    .maybeSingle();

  if (error || !workspace) {
    return NextResponse.json({ message: error?.message || "Create failed" }, { status: 500 });
  }

  const { data: membership, error: memErr } = await supabase
    .from("hq_internal_users")
    .insert({
      auth_user_id: session.authUserId,
      workspace_id: workspace.id,
      email: session.email,
      full_name: session.fullName,
      is_active: true,
      is_primary: false,
    })
    .select("id")
    .maybeSingle();

  if (memErr || !membership) {
    return NextResponse.json({ message: memErr?.message || "Membership failed" }, { status: 500 });
  }

  const roleKey = (body.roleKey as HqRoleKey) || "founder";
  const { data: role } = await supabase.from("hq_roles").select("id").eq("key", roleKey).maybeSingle();
  if (role?.id) {
    await supabase.from("hq_internal_user_roles").insert({
      internal_user_id: membership.id,
      role_id: role.id,
    });
  }

  // Seed data sources for the new workspace
  const sources = [
    ["supabase", "Supabase", "connected"],
    ["website", "INTERTEXE website", "connected"],
    ["ios_app", "iOS app", "not_connected"],
    ["chrome_extension", "Chrome extension", "connected"],
    ["rakuten_feed", "Rakuten product feed", "not_connected"],
    ["rakuten_revenue", "Rakuten revenue reports", "not_connected"],
    ["resend", "Resend email", "not_connected"],
    ["app_store_connect", "App Store Connect", "not_connected"],
    ["chrome_web_store", "Chrome Web Store", "not_connected"],
  ] as const;
  await supabase.from("hq_data_sources").insert(
    sources.map(([key, label, status]) => ({
      workspace_id: workspace.id,
      key,
      label,
      status,
    }))
  );

  return NextResponse.json({ workspace, membershipId: membership.id });
}
