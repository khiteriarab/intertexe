import { NextRequest, NextResponse } from "next/server";
import { requireOrgApi } from "../../../../../../lib/enterprise/api-auth";
import { auditLogActions, loadAuditLogs } from "../../../../../../lib/enterprise/audit-query";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ organization: string }> }
) {
  const { organization } = await context.params;
  const gate = await requireOrgApi(organization);
  if (gate.error) return gate.error;
  const role = gate.access.membership.role;
  if (!["owner", "admin"].includes(role)) {
    return NextResponse.json({ message: "Admin access required." }, { status: 403 });
  }
  const action = request.nextUrl.searchParams.get("action") || undefined;
  const objectType = request.nextUrl.searchParams.get("objectType") || undefined;
  if (request.nextUrl.searchParams.get("actions") === "1") {
    const actions = await auditLogActions(gate.access.client, gate.access.membership.organizationId);
    return NextResponse.json({ actions });
  }
  const items = await loadAuditLogs(gate.access.client, gate.access.membership.organizationId, {
    action,
    objectType,
    limit: 100,
  });
  return NextResponse.json({ items });
}
