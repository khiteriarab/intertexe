import type { SupabaseClient } from "@supabase/supabase-js";
import { CUSTOMER_ZERO_SLUG, DEMO_BRAND_SLUG, isReservedHqSlug } from "./constants";
import { authUserIdFromAccessToken } from "./jwt-claims";
import type { EnterpriseMembership, WorkspaceContext } from "./types";

export type { EnterpriseMembership, WorkspaceContext } from "./types";

export async function listEnterpriseMembershipsForUser(
  client: SupabaseClient,
  accessToken?: string | null
): Promise<EnterpriseMembership[]> {
  const authUserId = accessToken ? authUserIdFromAccessToken(accessToken) : null;
  let profileQuery = client.from("profiles").select("id");
  if (authUserId) {
    profileQuery = profileQuery.eq("auth_user_id", authUserId);
  }
  const { data: profile } = await profileQuery.maybeSingle();
  if (!profile?.id) return [];

  const { data: rows } = await client
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
      productAllowance: org.product_allowance == null ? null : Number(org.product_allowance),
    });
  }
  return memberships;
}

export function buildWorkspaceContexts(input: {
  hq: boolean;
  hasStaffDppLink?: boolean;
  memberships: EnterpriseMembership[];
}): WorkspaceContext[] {
  const contexts: WorkspaceContext[] = [];
  if (input.hq) {
    contexts.push({ type: "hq", label: "INTERTEXE HQ", href: "/dashboard" });
  }
  const seen = new Set<string>();
  for (const membership of input.memberships) {
    if (membership.slug === DEMO_BRAND_SLUG) continue;
    seen.add(membership.slug);
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
  if (input.hasStaffDppLink && !seen.has(CUSTOMER_ZERO_SLUG)) {
    contexts.push({
      type: "org",
      label: "INTERTEXE — DPP Workspace",
      href: `/dashboard/${CUSTOMER_ZERO_SLUG}`,
      slug: CUSTOMER_ZERO_SLUG,
      role: "owner",
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
