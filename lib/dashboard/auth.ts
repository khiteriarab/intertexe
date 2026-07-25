import { cache } from "react";
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

type MembershipRow = {
  id: string;
  workspace_id: string;
  full_name: string | null;
  is_active: boolean;
  email: string | null;
  is_primary: boolean | null;
};

/** Warm-isolate memo so consecutive HQ navigations reuse session for ~20s. */
const SESSION_TTL_MS = 20_000;
const sessionMemo = new Map<string, { at: number; session: HqSession | null }>();

async function resolveHqSession(): Promise<HqSession | null> {
  const token = await readHqAccessToken();
  if (!token) return null;

  const memoKey = token.slice(-48);
  const hit = sessionMemo.get(memoKey);
  if (hit && Date.now() - hit.at < SESSION_TTL_MS) return hit.session;

  const auth = getSupabaseAnonAuthClient();
  if (!auth) return null;

  const { data, error } = await auth.auth.getUser(token);
  if (error || !data.user?.id || !data.user.email) {
    sessionMemo.set(memoKey, { at: Date.now(), session: null });
    return null;
  }

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

  if (!memberships?.length) {
    sessionMemo.set(memoKey, { at: Date.now(), session: null });
    return null;
  }

  const typedMemberships = memberships as MembershipRow[];
  const workspaceIds = typedMemberships.map((m) => m.workspace_id);
  const membershipIds = typedMemberships.map((m) => m.id);

  // One parallel wave instead of workspace → roles → role keys waterfall.
  const [workspaceRes, roleLinkRes, roleCatalogRes] = await Promise.all([
    supabase.from("hq_workspaces").select("id, slug, name").in("id", workspaceIds),
    supabase
      .from("hq_internal_user_roles")
      .select("internal_user_id, role_id")
      .in("internal_user_id", membershipIds),
    supabase.from("hq_roles").select("id, key"),
  ]);

  const workspaceRows = workspaceRes.data || [];
  const roleLinks = roleLinkRes.data || [];
  const roleById = new Map(
    (roleCatalogRes.data || []).map((r: { id: string; key: string }) => [r.id, r.key as HqRoleKey])
  );

  const workspaces = workspaceRows
    .map((w) => {
      const mem = typedMemberships.find((m) => m.workspace_id === w.id);
      if (!mem) return null;
      return {
        id: w.id,
        slug: w.slug,
        name: w.name,
        internalUserId: mem.id,
      };
    })
    .filter(Boolean) as Array<{ id: string; slug: string; name: string; internalUserId: string }>;

  if (!workspaces.length) {
    sessionMemo.set(memoKey, { at: Date.now(), session: null });
    return null;
  }

  const jar = await cookies();
  const preferred = jar.get(HQ_WORKSPACE_COOKIE)?.value?.trim();
  const active =
    workspaces.find((w) => w.id === preferred || w.slug === preferred) ||
    workspaces.find((w) => {
      const mem = typedMemberships.find((m) => m.id === w.internalUserId);
      return mem?.is_primary;
    }) ||
    workspaces.find((w) => w.slug === HQ_WORKSPACE_SLUG) ||
    workspaces[0];

  const internal = typedMemberships.find((m) => m.id === active.internalUserId)!;
  const roles = roleLinks
    .filter((r) => r.internal_user_id === internal.id)
    .map((r) => roleById.get(r.role_id))
    .filter(Boolean) as HqRoleKey[];

  if (roles.length === 0) {
    sessionMemo.set(memoKey, { at: Date.now(), session: null });
    return null;
  }

  const session: HqSession = {
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
  sessionMemo.set(memoKey, { at: Date.now(), session });
  return session;
}

/**
 * Resolve HQ session once per request (layout + page used to double every Supabase round-trip).
 */
export const getHqSession = cache(async (): Promise<HqSession | null> => resolveHqSession());

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

  const [{ data: workspace }, { data: role }] = await Promise.all([
    supabase.from("hq_workspaces").select("id").eq("slug", HQ_WORKSPACE_SLUG).maybeSingle(),
    supabase.from("hq_roles").select("id").eq("key", "founder").maybeSingle(),
  ]);
  if (!workspace?.id || !role?.id) return null;

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
