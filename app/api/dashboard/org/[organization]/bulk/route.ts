import { NextRequest, NextResponse } from "next/server";
import { requireOrgApi } from "../../../../../../lib/enterprise/api-auth";
import { bulkApproveProductFields, bulkArchiveProducts, bulkResolveIssues } from "../../../../../../lib/enterprise/bulk-ops";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ organization: string }> }
) {
  const { organization } = await context.params;
  const gate = await requireOrgApi(organization, { mutate: true });
  if (gate.error) return gate.error;
  const body = await request.json();
  const action = String(body.action || "");

  if (action === "resolve_issues") {
    const result = await bulkResolveIssues({
      client: gate.access.client,
      organizationId: gate.access.membership.organizationId,
      issueIds: body.issueIds || [],
      action: body.issueAction || "resolve",
    });
    return NextResponse.json(result);
  }
  if (action === "approve_fields") {
    const result = await bulkApproveProductFields({
      client: gate.access.client,
      organizationId: gate.access.membership.organizationId,
      productIds: body.productIds || [],
      reason: body.reason,
    });
    return NextResponse.json(result);
  }
  if (action === "archive_products") {
    const result = await bulkArchiveProducts({
      client: gate.access.client,
      organizationId: gate.access.membership.organizationId,
      productIds: body.productIds || [],
    });
    return NextResponse.json(result);
  }
  return NextResponse.json({ message: "Unknown bulk action." }, { status: 400 });
}
