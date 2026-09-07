import { NextRequest, NextResponse } from "next/server";
import { requireOrgApi } from "../../../../../../lib/enterprise/api-auth";
import { globalEnterpriseSearch } from "../../../../../../lib/enterprise/global-search";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ organization: string }> }
) {
  const { organization } = await context.params;
  const gate = await requireOrgApi(organization);
  if (gate.error) return gate.error;
  const q = request.nextUrl.searchParams.get("q") || "";
  const results = await globalEnterpriseSearch(
    gate.access.client,
    gate.access.membership.organizationId,
    organization,
    q
  );
  return NextResponse.json({ results });
}
