import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getEnterpriseServiceClient, isEnterpriseConfigured } from "./client";
import { isReservedHqSlug, isValidOrgSlug } from "./constants";
import { getDeploymentEnv } from "./environment";
import { publicSiteOrigin } from "./founder-invitations";
import { slugifyOrganizationName } from "./ids";
import { isPilotPlan, PILOT_PRODUCT_LIMIT } from "./pricing";
import { provisionOrganizationOperator } from "./provision-organization-operator";

export type ProvisionPilotResult =
  | {
      status: "created";
      organizationId: string;
      slug: string;
      workspaceUrl: string;
      inviteUrl: string | null;
      setupLink: string | null;
    }
  | {
      status: "existing";
      slug: string;
      workspaceUrl: string;
      message: string;
    }
  | { status: "skipped"; reason: string };

async function findExistingPilotOrgForEmail(
  client: SupabaseClient,
  email: string
): Promise<{ organizationId: string; slug: string; name: string } | null> {
  const normalized = email.trim().toLowerCase();

  const { data: profile } = await client.from("profiles").select("id").eq("email", normalized).maybeSingle();
  if (profile?.id) {
    const { data: memberships } = await client
      .from("organization_memberships")
      .select("organization_id, organizations(id, slug, name, plan)")
      .eq("user_id", profile.id)
      .eq("status", "active");
    for (const row of memberships || []) {
      const org = Array.isArray(row.organizations) ? row.organizations[0] : row.organizations;
      if (!org?.slug || !isPilotPlan(String(org.plan || ""))) continue;
      return {
        organizationId: String(row.organization_id || org.id),
        slug: String(org.slug),
        name: String(org.name),
      };
    }
  }

  const { data: invites } = await client
    .from("invitations")
    .select("organization_id, organizations(id, slug, name, plan)")
    .eq("email", normalized)
    .is("revoked_at", null)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(5);

  for (const row of invites || []) {
    const org = Array.isArray(row.organizations) ? row.organizations[0] : row.organizations;
    if (!org?.slug || !isPilotPlan(String(org.plan || ""))) continue;
    return {
      organizationId: String(row.organization_id || org.id),
      slug: String(org.slug),
      name: String(org.name),
    };
  }

  return null;
}

async function createPilotOrganization(
  client: SupabaseClient,
  companyName: string
): Promise<{ id: string; slug: string; name: string }> {
  let slug = slugifyOrganizationName(companyName);
  if (!slug || isReservedHqSlug(slug) || !isValidOrgSlug(slug)) {
    slug = `pilot-${randomBytes(3).toString("hex")}`;
  }
  const { data: clash } = await client.from("organizations").select("id").eq("slug", slug).maybeSingle();
  if (clash?.id) slug = `${slug}-${randomBytes(2).toString("hex")}`;

  const now = new Date().toISOString();
  const { data: org, error } = await client
    .from("organizations")
    .insert({
      slug,
      name: companyName,
      kind: "pilot",
      plan: "demo",
      account_state: "active",
      snapshot_stage: "invited",
      product_allowance: PILOT_PRODUCT_LIMIT,
      passport_allowance: PILOT_PRODUCT_LIMIT,
      pilot_started_at: now,
      entitlements: { product_limit: PILOT_PRODUCT_LIMIT, pilot: true },
      environment: getDeploymentEnv(),
      data_classification: "customer_confidential",
      is_demo: false,
    })
    .select("id, slug, name")
    .maybeSingle();
  if (error || !org?.id) throw new Error(error?.message || "Could not create pilot workspace.");

  const { data: workspace } = await client
    .from("workspaces")
    .insert({
      organization_id: org.id,
      slug: "default",
      name: "Default workspace",
    })
    .select("id")
    .maybeSingle();

  await client.from("catalogs").insert({
    organization_id: org.id,
    workspace_id: workspace?.id || null,
    name: "Main catalog",
  });

  await client.from("audit_logs").insert({
    organization_id: org.id,
    action: "pilot_workspace_auto_provisioned",
    object_type: "organization",
    object_id: org.id,
    request_meta: { source: "platform_lead" },
  });

  return { id: String(org.id), slug: String(org.slug), name: String(org.name) };
}

/** Auto-provision a 10-product pilot workspace after public lead submit. */
export async function provisionPilotWorkspaceFromLead(input: {
  companyName: string;
  contactEmail: string;
  firstName: string;
  lastName: string;
}): Promise<ProvisionPilotResult> {
  if (!isEnterpriseConfigured()) {
    return { status: "skipped", reason: "enterprise_not_configured" };
  }
  const client = getEnterpriseServiceClient();
  if (!client) return { status: "skipped", reason: "enterprise_client_unavailable" };

  const email = input.contactEmail.trim().toLowerCase();
  const fullName = `${input.firstName.trim()} ${input.lastName.trim()}`.trim();
  const companyName = input.companyName.trim();
  if (!email || !fullName || !companyName) {
    return { status: "skipped", reason: "missing_contact_fields" };
  }

  const existing = await findExistingPilotOrgForEmail(client, email);
  if (existing) {
    return {
      status: "existing",
      slug: existing.slug,
      workspaceUrl: `${publicSiteOrigin()}/dashboard/${existing.slug}`,
      message: "Pilot workspace already exists for this email.",
    };
  }

  const org = await createPilotOrganization(client, companyName);
  const provision = await provisionOrganizationOperator({
    client,
    organizationId: org.id,
    email,
    fullName,
    role: "owner",
    actorEmail: "platform-leads@intertexe.com",
    confirmCrossOrg: true,
  });

  if (provision.status === "already_member") {
    return {
      status: "existing",
      slug: org.slug,
      workspaceUrl: `${publicSiteOrigin()}/dashboard/${org.slug}`,
      message: provision.message,
    };
  }
  if (provision.status === "needs_cross_org_confirmation") {
    return { status: "skipped", reason: "cross_org_confirmation_required" };
  }

  return {
    status: "created",
    organizationId: org.id,
    slug: org.slug,
    workspaceUrl: `${publicSiteOrigin()}/dashboard/${org.slug}`,
    inviteUrl: provision.setupLink,
    setupLink: provision.setupLink,
  };
}
