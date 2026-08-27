import { notFound, redirect } from "next/navigation";
import { getHqSession } from "../dashboard/auth";
import { isEnterpriseConfigured } from "./client";
import { DEMO_BRAND_SLUG, CUSTOMER_ZERO_SLUG, isReservedHqSlug, isValidOrgSlug } from "./constants";
import {
  buildWorkspaceContexts,
  ensureCustomerZeroMembership,
  listEnterpriseMemberships,
  type EnterpriseMembership,
  type WorkspaceContext,
} from "./memberships";
import { getEnterpriseAuthSession } from "./session";
import { canMutateEnterprise } from "./roles";

export { canMutateEnterprise } from "./roles";

export type DashboardActor = {
  email: string;
  fullName: string | null;
  hq: boolean;
  hqRoles: string[];
  memberships: EnterpriseMembership[];
  contexts: WorkspaceContext[];
};

export async function resolveDashboardActor(): Promise<DashboardActor | null> {
  const [hq, enterprise] = await Promise.all([getHqSession(), getEnterpriseAuthSession()]);
  const email = hq?.email || enterprise?.email;
  if (!email) return null;

  let memberships = email ? await listEnterpriseMemberships(email) : [];
  if (
    hq?.roles.includes("founder") &&
    isEnterpriseConfigured() &&
    !memberships.some((item) => item.slug === CUSTOMER_ZERO_SLUG)
  ) {
    await ensureCustomerZeroMembership({
      email: hq.email,
      fullName: hq.fullName,
      superAdmin: true,
    });
    memberships = await listEnterpriseMemberships(email);
  }
  return {
    email,
    fullName: hq?.fullName || enterprise?.fullName || null,
    hq: Boolean(hq),
    hqRoles: hq?.roles || [],
    memberships,
    contexts: buildWorkspaceContexts({ hq: Boolean(hq), memberships }),
  };
}

export async function requireDashboardActor(): Promise<DashboardActor> {
  const actor = await resolveDashboardActor();
  if (!actor) redirect("/dashboard/login");
  return actor;
}

export async function getOrganizationAccess(slug: string): Promise<
  | { ok: true; actor: DashboardActor; membership: EnterpriseMembership }
  | { ok: false; status: number; message: string }
> {
  if (isReservedHqSlug(slug) || !isValidOrgSlug(slug)) {
    return { ok: false, status: 404, message: "Not found." };
  }
  const actor = await resolveDashboardActor();
  if (!actor) return { ok: false, status: 401, message: "Sign in required." };
  const membership = actor.memberships.find((item) => item.slug === slug);
  if (!membership) return { ok: false, status: 404, message: "Not found." };
  if (slug === DEMO_BRAND_SLUG && !actor.hq) {
    return { ok: false, status: 404, message: "Not found." };
  }
  return { ok: true, actor, membership };
}

export async function requireOrganizationAccess(slug: string): Promise<{
  actor: DashboardActor;
  membership: EnterpriseMembership;
}> {
  const result = await getOrganizationAccess(slug);
  if (!result.ok) {
    if (result.status === 401) redirect("/dashboard/login");
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
