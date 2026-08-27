import { getEnterpriseServiceClient } from "./client";
import { CUSTOMER_ZERO_SLUG, DEMO_BRAND_SLUG, isReservedHqSlug } from "./constants";
import type { EnterpriseMembership, WorkspaceContext } from "./types";

export type { EnterpriseMembership, WorkspaceContext } from "./types";

export async function listEnterpriseMemberships(email: string): Promise<EnterpriseMembership[]> {
  const supabase = getEnterpriseServiceClient();
  if (!supabase || !email) return [];

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email.toLowerCase())
    .maybeSingle();
  if (!profile?.id) return [];

  const { data: rows } = await supabase
    .from("organization_memberships")
    .select("role, status, organizations(id, slug, name, kind, plan, is_demo, product_allowance)")
    .eq("user_id", profile.id)
    .eq("status", "active");

  const memberships: EnterpriseMembership[] = [];
  for (const row of rows || []) {
    const org = Array.isArray(row.organizations) ? row.organizations[0] : row.organizations;
    if (!org?.slug || isReservedHqSlug(org.slug)) continue;
    memberships.push({
      organizationId: String(org.id),
      slug: String(org.slug),
      name: String(org.name),
      role: String(row.role),
      kind: String(org.kind || ""),
      plan: String(org.plan || ""),
      isDemo: Boolean(org.is_demo),
      productAllowance:
        org.product_allowance == null ? null : Number(org.product_allowance),
    });
  }
  return memberships;
}

export async function ensureCustomerZeroMembership(input: {
  email: string;
  fullName?: string | null;
  superAdmin?: boolean;
}): Promise<EnterpriseMembership | null> {
  const supabase = getEnterpriseServiceClient();
  if (!supabase) return null;
  const email = input.email.trim().toLowerCase();
  if (!email) return null;

  const { data: org } = await supabase
    .from("organizations")
    .select("id, slug, name, kind, plan, is_demo")
    .eq("slug", CUSTOMER_ZERO_SLUG)
    .maybeSingle();
  if (!org?.id) return null;

  const { data: existing } = await supabase.from("profiles").select("id").eq("email", email).maybeSingle();
  let profileId = existing?.id as string | undefined;
  if (!profileId) {
    const { data: created, error } = await supabase
      .from("profiles")
      .insert({
        email,
        full_name: input.fullName || null,
        intertexe_super_admin: Boolean(input.superAdmin),
      })
      .select("id")
      .maybeSingle();
    if (error || !created?.id) return null;
    profileId = created.id;
  } else if (input.superAdmin) {
    await supabase.from("profiles").update({ intertexe_super_admin: true }).eq("id", profileId);
  }

  await supabase.from("organization_memberships").upsert(
    {
      organization_id: org.id,
      user_id: profileId,
      role: "owner",
      status: "active",
    },
    { onConflict: "organization_id,user_id" }
  );

  return {
    organizationId: org.id,
    slug: org.slug,
    name: org.name,
    role: "owner",
    kind: org.kind,
    plan: org.plan,
    isDemo: Boolean(org.is_demo),
    productAllowance: null,
  };
}

export function buildWorkspaceContexts(input: {
  hq: boolean;
  memberships: EnterpriseMembership[];
}): WorkspaceContext[] {
  const contexts: WorkspaceContext[] = [];
  if (input.hq) {
    contexts.push({ type: "hq", label: "INTERTEXE HQ", href: "/dashboard" });
  }
  for (const membership of input.memberships) {
    if (membership.slug === DEMO_BRAND_SLUG) continue;
    const label =
      membership.slug === CUSTOMER_ZERO_SLUG ? "INTERTEXE — DPP Workspace" : membership.name;
    contexts.push({
      type: "org",
      label,
      href: `/dashboard/${membership.slug}`,
      slug: membership.slug,
      role: membership.role,
    });
  }
  return contexts;
}

export function resolvePostLoginPath(input: {
  next?: string | null;
  hq: boolean;
  memberships: EnterpriseMembership[];
}): string {
  const next = String(input.next || "").trim();
  if (next.startsWith("/dashboard/") && !next.startsWith("/dashboard/login")) {
    return next;
  }
  if (input.hq) return "/dashboard";
  const first = input.memberships.find((m) => m.slug !== DEMO_BRAND_SLUG);
  if (first) return `/dashboard/${first.slug}`;
  return "/dashboard";
}
