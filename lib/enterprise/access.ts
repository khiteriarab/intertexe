import type { SupabaseClient } from "@supabase/supabase-js";
import { notFound, redirect } from "next/navigation";
import { getHqSession } from "../dashboard/auth";
import { getEnterpriseUserClient, isEnterpriseConfigured } from "./client";
import { DEMO_BRAND_SLUG, isReservedHqSlug, isValidOrgSlug } from "./constants";
import { getActiveIdentityLinkByHqUserId } from "./identity-links";
import {
  buildWorkspaceContexts,
  listEnterpriseMembershipsForUser,
  type EnterpriseMembership,
  type WorkspaceContext,
} from "./memberships";
import { canMutateEnterprise } from "./roles";
import { getEnterpriseAuthSession } from "./session";

export { canMutateEnterprise } from "./roles";

export type DashboardActor = {
  email: string;
  fullName: string | null;
  hq: boolean;
  hqRoles: string[];
  memberships: EnterpriseMembership[];
  contexts: WorkspaceContext[];
  enterpriseAuthUserId: string | null;
  enterpriseAccessToken: string | null;
  sessionKind: "none" | "native" | "handoff";
};

export async function resolveDashboardActor(): Promise<DashboardActor | null> {
  const [hq, enterprise] = await Promise.all([getHqSession(), getEnterpriseAuthSession()]);
  if (!hq && !enterprise) return null;

  const memberships =
    enterprise && isEnterpriseConfigured()
      ? await listEnterpriseMembershipsForUser(
          getEnterpriseUserClient(enterprise.accessToken),
          enterprise.accessToken
        )
      : [];
  const hasStaffDppLink = hq ? Boolean(await getActiveIdentityLinkByHqUserId(hq.authUserId)) : false;

  return {
    email: hq?.email || enterprise?.email || "",
    fullName: hq?.fullName || enterprise?.fullName || null,
    hq: Boolean(hq),
    hqRoles: hq?.roles || [],
    memberships,
    contexts: buildWorkspaceContexts({
      hq: Boolean(hq),
      hasStaffDppLink,
      memberships,
    }),
    enterpriseAuthUserId: enterprise?.authUserId || null,
    enterpriseAccessToken: enterprise?.accessToken || null,
    sessionKind: enterprise?.kind || "none",
  };
}

export async function requireDashboardActor(): Promise<DashboardActor> {
  const actor = await resolveDashboardActor();
  if (!actor) redirect("/dashboard/login");
  return actor;
}

export async function getOrganizationAccess(slug: string): Promise<
  | { ok: true; actor: DashboardActor; membership: EnterpriseMembership; client: SupabaseClient }
  | { ok: false; status: number; message: string }
> {
  if (isReservedHqSlug(slug) || !isValidOrgSlug(slug)) {
    return { ok: false, status: 404, message: "Not found." };
  }
  const actor = await resolveDashboardActor();
  if (!actor) return { ok: false, status: 401, message: "Sign in required." };
  if (!actor.enterpriseAccessToken) {
    return {
      ok: false,
      status: actor.hq ? 403 : 401,
      message: actor.hq ? "Enterprise session required." : "Sign in required.",
    };
  }
  const membership = actor.memberships.find((item) => item.slug === slug);
  if (!membership) return { ok: false, status: 404, message: "Not found." };
  if (slug === DEMO_BRAND_SLUG && !actor.hq) {
    return { ok: false, status: 404, message: "Not found." };
  }
  return {
    ok: true,
    actor,
    membership,
    client: getEnterpriseUserClient(actor.enterpriseAccessToken),
  };
}

export async function requireOrganizationAccess(slug: string): Promise<{
  actor: DashboardActor;
  membership: EnterpriseMembership;
  client: SupabaseClient;
}> {
  const result = await getOrganizationAccess(slug);
  if (!result.ok) {
    if (result.status === 401) redirect("/dashboard/login");
    if (result.status === 403) redirect("/dashboard");
    notFound();
  }
  return result;
}

export async function requireOrganizationMutation(slug: string) {
  const access = await requireOrganizationAccess(slug);
  if (!canMutateEnterprise(access.membership.role)) {
    notFound();
  }
  return access;
}

export function assertNotFounderOnly(actor: DashboardActor): void {
  if (!actor.hq) redirect("/dashboard/login");
}
