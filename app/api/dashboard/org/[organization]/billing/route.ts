import { NextResponse } from "next/server";
import { requireOrgApi } from "../../../../../../lib/enterprise/api-auth";
import { resolveCommercialAccountStatus } from "../../../../../../lib/enterprise/account-status";
import { loadBillingDashboard } from "../../../../../../lib/enterprise/billing-gates";

export const dynamic = "force-dynamic";

/** Billing & usage for all org members — customer SaaS workspace, not founder HQ. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ organization: string }> }
) {
  const { organization } = await context.params;
  const gate = await requireOrgApi(organization);
  if (gate.error) return gate.error;

  const billing = await loadBillingDashboard(gate.access.client, gate.access.membership.organizationId);
  const canAdmin = ["owner", "admin"].includes(gate.access.membership.role);

  return NextResponse.json({
    ...billing,
    canAdmin,
    commercialStatus: resolveCommercialAccountStatus({
      plan: billing.plan,
      billingStatus: billing.billingStatus,
    }),
  });
}
