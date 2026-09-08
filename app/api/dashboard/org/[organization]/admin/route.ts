import { NextRequest, NextResponse } from "next/server";
import { requireOrgApi } from "../../../../../../lib/enterprise/api-auth";
import { loadBillingDashboard } from "../../../../../../lib/enterprise/billing-gates";
import { loadSecuritySettings, updateSecuritySettings } from "../../../../../../lib/enterprise/security-settings";
import { disableScimConnection, enableScimConnection, getScimStatus } from "../../../../../../lib/enterprise/scim";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ organization: string }> }
) {
  const { organization } = await context.params;
  const gate = await requireOrgApi(organization);
  if (gate.error) return gate.error;
  if (!["owner", "admin"].includes(gate.access.membership.role)) {
    return NextResponse.json({ message: "Admin access required." }, { status: 403 });
  }
  const section = request.nextUrl.searchParams.get("section") || "security";
  if (section === "billing") {
    const billing = await loadBillingDashboard(gate.access.client, gate.access.membership.organizationId);
    return NextResponse.json(billing);
  }
  if (section === "scim") {
    const scim = await getScimStatus(gate.access.client, gate.access.membership.organizationId);
    return NextResponse.json({ scim });
  }
  const security = await loadSecuritySettings(gate.access.client, gate.access.membership.organizationId);
  return NextResponse.json({ security });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ organization: string }> }
) {
  const { organization } = await context.params;
  const gate = await requireOrgApi(organization, { mutate: true });
  if (gate.error) return gate.error;
  if (!["owner", "admin"].includes(gate.access.membership.role)) {
    return NextResponse.json({ message: "Admin access required." }, { status: 403 });
  }
  const body = await request.json();
  if (body.section === "security") {
    await updateSecuritySettings(gate.access.client, gate.access.membership.organizationId, body.patch || {});
    return NextResponse.json({ ok: true });
  }
  if (body.section === "scim" && body.action === "enable") {
    const result = await enableScimConnection(gate.access.client, gate.access.membership.organizationId);
    return NextResponse.json({ ok: true, ...result });
  }
  if (body.section === "scim" && body.action === "disable") {
    await disableScimConnection(gate.access.client, gate.access.membership.organizationId);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ message: "Unknown section." }, { status: 400 });
}
