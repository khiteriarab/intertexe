import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { requireHqSession } from "../../../../../lib/dashboard/auth";
import { getEnterpriseServiceClient, isEnterpriseConfigured } from "../../../../../lib/enterprise/client";
import { isReservedHqSlug, isValidOrgSlug } from "../../../../../lib/enterprise/constants";
import { slugifyOrganizationName } from "../../../../../lib/enterprise/ids";
import { getDeploymentEnv } from "../../../../../lib/enterprise/environment";
import { writeHqEnterprisePointers } from "../../../../../lib/enterprise/hq-refs";
import {
  createOrganizationInvitation,
  listOrganizationInvitations,
} from "../../../../../lib/enterprise/founder-invitations";

export const dynamic = "force-dynamic";

const SNAPSHOT_STAGES = [
  "invited",
  "upload_pending",
  "uploaded",
  "processing",
  "results_ready",
  "prospect_viewed",
  "follow_up_due",
  "pilot_offered",
  "converted",
  "declined",
] as const;

async function invitationsForOrgs(supabase: NonNullable<ReturnType<typeof getEnterpriseServiceClient>>, orgIds: string[]) {
  const map = new Map<string, Awaited<ReturnType<typeof listOrganizationInvitations>>>();
  await Promise.all(
    orgIds.map(async (orgId) => {
      map.set(orgId, await listOrganizationInvitations(supabase, orgId));
    })
  );
  return map;
}

export async function GET() {
  const session = await requireHqSession({ roles: ["founder"] });
  void session;
  const supabase = getEnterpriseServiceClient();
  if (!supabase) {
    return NextResponse.json({ configured: false, organizations: [] });
  }
  const { data } = await supabase
    .from("organizations")
    .select("id, slug, name, plan, kind, snapshot_stage, product_allowance, hq_deal_id, created_at")
    .in("kind", ["snapshot", "pilot", "customer"])
    .order("created_at", { ascending: false })
    .limit(100);
  const orgs = data || [];
  const inviteMap = await invitationsForOrgs(
    supabase,
    orgs.map((row) => row.id)
  );
  return NextResponse.json({
    configured: true,
    organizations: orgs.map((row) => ({
      ...row,
      invitations: inviteMap.get(row.id) || [],
    })),
  });
}

export async function POST(request: NextRequest) {
  const session = await requireHqSession({ roles: ["founder"] });
  if (!isEnterpriseConfigured()) {
    return NextResponse.json(
      { message: "Enterprise database is not linked. Add ENTERPRISE_SUPABASE_* environment variables." },
      { status: 503 }
    );
  }
  const supabase = getEnterpriseServiceClient();
  if (!supabase) {
    return NextResponse.json({ message: "Enterprise database is not linked." }, { status: 503 });
  }

  const body = await request.json();
  const companyName = String(body.companyName || "").trim();
  const contactEmail = String(body.contactEmail || "").trim().toLowerCase();
  const hqDealId = String(body.hqDealId || "").trim() || null;
  const hqContactId = String(body.hqContactId || "").trim() || null;
  if (!companyName || !contactEmail) {
    return NextResponse.json({ message: "Company name and contact email are required." }, { status: 400 });
  }

  let slug = slugifyOrganizationName(companyName);
  if (!slug || isReservedHqSlug(slug) || !isValidOrgSlug(slug)) {
    slug = `snapshot-${randomBytes(3).toString("hex")}`;
  }
  const { data: clash } = await supabase.from("organizations").select("id").eq("slug", slug).maybeSingle();
  if (clash?.id) slug = `${slug}-${randomBytes(2).toString("hex")}`;

  const { data: org, error } = await supabase
    .from("organizations")
    .insert({
      slug,
      name: companyName,
      kind: "snapshot",
      plan: "free_snapshot",
      account_state: "invited",
      snapshot_stage: "invited",
      product_allowance: 10,
      passport_allowance: 1,
      hq_deal_id: hqDealId,
      hq_contact_id: hqContactId,
      entitlements: { product_limit: 10, snapshot: true },
    })
    .select("id, slug, name")
    .maybeSingle();
  if (error || !org) {
    return NextResponse.json({ message: "Could not create organization." }, { status: 500 });
  }

  await supabase.from("organizations").update({
    environment: getDeploymentEnv(),
    data_classification: "customer_confidential",
    is_demo: false,
  }).eq("id", org.id);

  const { data: workspace } = await supabase
    .from("workspaces")
    .insert({
      organization_id: org.id,
      slug: "default",
      name: "Default workspace",
    })
    .select("id")
    .maybeSingle();

  await supabase.from("catalogs").insert({
    organization_id: org.id,
    workspace_id: workspace?.id || null,
    name: "Main catalog",
  });

  const invite = await createOrganizationInvitation({
    client: supabase,
    organizationId: org.id,
    email: contactEmail,
    role: "owner",
    actorEmail: session.email,
    auditAction: "invitation_created_with_snapshot",
  });

  await supabase.from("audit_logs").insert({
    organization_id: org.id,
    action: "snapshot_workspace_created",
    object_type: "organization",
    object_id: org.id,
    request_meta: { actor_email: session.email, stages: SNAPSHOT_STAGES },
  });

  await writeHqEnterprisePointers({
    hqDealId,
    organizationId: org.id,
    slug: org.slug,
    pilotStatus: "snapshot",
    implementationStatus: "invited",
  });

  const invitations = await listOrganizationInvitations(supabase, org.id);

  return NextResponse.json({
    ok: true,
    organization: org,
    invitePath: invite.invitePath,
    inviteUrl: invite.inviteUrl,
    invitations,
    emailDelivery: "not_sent",
  });
}
