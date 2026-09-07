import { NextRequest, NextResponse } from "next/server";
import { requireOrgApi } from "../../../../../../lib/enterprise/api-auth";
import { loadImportDetail, loadImportHistory } from "../../../../../../lib/enterprise/import-ops";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ organization: string }> }
) {
  const { organization } = await context.params;
  const gate = await requireOrgApi(organization);
  if (gate.error) return gate.error;
  const importId = request.nextUrl.searchParams.get("id");
  if (importId) {
    const detail = await loadImportDetail(gate.access.client, gate.access.membership.organizationId, importId);
    if (!detail) return NextResponse.json({ message: "Not found." }, { status: 404 });
    return NextResponse.json(detail);
  }
  const items = await loadImportHistory(gate.access.client, gate.access.membership.organizationId);
  return NextResponse.json({ items });
}
