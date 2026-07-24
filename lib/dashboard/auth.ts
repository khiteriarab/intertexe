import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabaseAnonAuthClient } from "../supabase-auth-server";
import { getServerSupabase } from "../supabase-service-client";
import {
  HQ_FOUNDER_EMAILS,
  HQ_SESSION_COOKIE,
  HQ_WORKSPACE_COOKIE,
  HQ_WORKSPACE_SLUG,
  type HqRoleKey,
} from "./constants";

export {
  HQ_FOUNDER_EMAILS,
  HQ_NAV,
  HQ_SESSION_COOKIE,
  HQ_WORKSPACE_COOKIE,
  HQ_WORKSPACE_SLUG,
  isHqHost,
  type HqRoleKey,
} from "./constants";

export type HqSession = {
  authUserId: string;
  email: string;
  fullName: string | null;
  internalUserId: string;
  workspaceId: string;
  workspaceSlug: string;
  workspaceName: string;
  roles: HqRoleKey[];
  accessToken: string;
  workspaces: Array<{ id: string; slug: string; name: string; internalUserId: string }>;
};

export async function readHqAccessToken(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(HQ_SESSION_COOKIE)?.value?.trim();
  return token || null;
}

export async function getHqSession(): Promise<HqSession | null> {
  const token = await readHqAccessToken();
  if (!token) return null;

  const auth = getSupabaseAnonAuthClient();
  if (!auth) return null;

  const { data, error } = await auth.auth.getUser(token);
  if (error || !data.user?.id || !data.user.email) return null;

  const supabase = getServerSupabase();
  if (!supabase) return null;

  const email = data.user.email.trim().toLowerCase();
  let { data: memberships } = await supabase
    .from("hq_internal_users")
    .select("id, workspace_id, full_name, is_active, email, is_primary")
    .eq("auth_user_id", data.user.id)
    .eq("is_active", true);

  if ((!memberships || memberships.length === 0) && HQ_FOUNDER_EMAILS.has(email)) {
    const provisioned = await provisionFounder(
      data.user.id,
      email,
      data.user.user_metadata?.name as string | undefined
    );
    if (provisioned) memberships = [provisioned];
  }

  if (!memberships?.length) return null;

  const workspaceIds = memberships.map((m) => m.workspace_id);
  const { data: workspaceRows } = await supabase
    .from("hq_workspaces")
    .select("id, slug, name")
    .in("id", workspaceIds);

  const workspaces = (workspaceRows || [])
    .map((w) => {
      const mem = memberships!.find((m) => m.workspace_id === w.id);
      if (!mem) return null;
      return {
        id: w.id,
        slug: w.slug,
        name: w.name,
        internalUserId: mem.id,
      };
    })
    .filter(Boolean) as Array<{ id: string; slug: string; name: string; internalUserId: string }>;

  if (!workspaces.length) return null;

  const jar = await cookies();
  const preferred = jar.get(HQ_WORKSPACE_COOKIE)?.value?.trim();
  const active =
    workspaces.find((w) => w.id === preferred || w.slug === preferred) ||
    workspaces.find((w) => {
      const mem = memberships!.find((m) => m.id === w.internalUserId);
      return mem?.is_primary;
    }) ||
    workspaces.find((w) => w.slug === HQ_WORKSPACE_SLUG) ||
    workspaces[0];

  const internal = memberships.find((m) => m.id === active.internalUserId)!;

  const { data: roleLinks } = await supabase
    .from("hq_internal_user_roles")
    .select("role_id")
    .eq("internal_user_id", internal.id);

  const roleIds = (roleLinks || []).map((r: { role_id: string }) => r.role_id).filter(Boolean);
  let roles: HqRoleKey[] = [];
  if (roleIds.length) {
    const { data: roleRows } = await supabase.from("hq_roles").select("key").in("id", roleIds);
    roles = (roleRows || []).map((r: { key: string }) => r.key as HqRoleKey).filter(Boolean);
  }

  if (roles.length === 0) return null;

  return {
    authUserId: data.user.id,
    email,
    fullName: internal.full_name || (data.user.user_metadata?.name as string) || null,
    internalUserId: internal.id,
    workspaceId: active.id,
    workspaceSlug: active.slug,
    workspaceName: active.name,
    roles,
    accessToken: token,
    workspaces,
  };
}

export async function requireHqSession(opts?: { roles?: HqRoleKey[] }): Promise<HqSession> {
  const session = await getHqSession();
  if (!session) redirect("/dashboard/login");
  if (opts?.roles?.length && !opts.roles.some((r) => session.roles.includes(r))) {
    redirect("/dashboard?denied=1");
  }
  return session;
}

async function provisionFounder(authUserId: string, email: string, name?: string) {
  const supabase = getServerSupabase();
  if (!supabase) return null;

  const { data: workspace } = await supabase
    .from("hq_workspaces")
    .select("id")
    .eq("slug", HQ_WORKSPACE_SLUG)
    .maybeSingle();
  if (!workspace?.id) return null;

  const { data: role } = await supabase.from("hq_roles").select("id").eq("key", "founder").maybeSingle();
  if (!role?.id) return null;

  const { data: inserted, error } = await supabase
    .from("hq_internal_users")
    .upsert(
      {
        auth_user_id: authUserId,
        workspace_id: workspace.id,
        email,
        full_name: name || "Khiteriara Brown",
        is_active: true,
        is_primary: true,
        last_login_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id,auth_user_id" }
    )
    .select("id, workspace_id, full_name, is_active, email, is_primary")
    .maybeSingle();

  if (error || !inserted) {
    console.error("HQ founder provision failed", error);
    return null;
  }

  await supabase.from("hq_internal_user_roles").upsert(
    { internal_user_id: inserted.id, role_id: role.id },
    { onConflict: "internal_user_id,role_id" }
  );

  await writeAuthAudit({
    workspaceId: workspace.id,
    authUserId,
    email,
    eventName: "founder_provisioned",
  });

  return inserted;
}

export async function writeAuthAudit(input: {
  workspaceId?: string | null;
  authUserId?: string | null;
  email?: string | null;
  eventName: string;
  metadata?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
}) {
  const supabase = getServerSupabase();
  if (!supabase) return;
  await supabase.from("hq_auth_audit_events").insert({
    workspace_id: input.workspaceId || null,
    auth_user_id: input.authUserId || null,
    email: input.email || null,
    event_name: input.eventName,
    ip: input.ip || null,
    user_agent: input.userAgent || null,
    metadata: input.metadata || {},
  });
}

