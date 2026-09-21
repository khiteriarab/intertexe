import { NextRequest, NextResponse } from "next/server";
import { requireOrgApi } from "../../../../../../lib/enterprise/api-auth";
import { loadOrganizationSustainabilityAnalytics } from "../../../../../../lib/sustainability/organization-analytics";
import { loadCatalogTraceabilitySummary } from "../../../../../../lib/enterprise/traceability";

export const dynamic = "force-dynamic";

/** Brand Sustainability Performance — aggregated catalog evidence, not marketing claims. */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ organization: string }> }
) {
  const { organization } = await context.params;
  const gate = await requireOrgApi(organization);
  if (gate.error) return gate.error;

  const [analytics, traceability] = await Promise.all([
    loadOrganizationSustainabilityAnalytics(gate.access.client, gate.access.membership.organizationId),
    loadCatalogTraceabilitySummary(gate.access.client, gate.access.membership.organizationId),
  ]);

  return NextResponse.json({
    organization: organization,
    sustainability: analytics,
    traceability,
    positioning: "Prove it, don't claim it — metrics derived from product-level evidence.",
  });
}
