import { NextRequest, NextResponse } from "next/server";
import { requireOrgApi } from "../../../../../../lib/enterprise/api-auth";
import { createGovernedExport, getExportPayload, listExports } from "../../../../../../lib/enterprise/exports";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ organization: string }> }
) {
  const { organization } = await context.params;
  const gate = await requireOrgApi(organization);
  if (gate.error) return gate.error;
  const snapshotId = request.nextUrl.searchParams.get("id");
  if (snapshotId) {
    const payload = await getExportPayload(gate.access.client, gate.access.membership.organizationId, snapshotId);
    if (!payload) return NextResponse.json({ message: "Not found." }, { status: 404 });
    return NextResponse.json(payload);
  }
  const items = await listExports(gate.access.client, gate.access.membership.organizationId);
  return NextResponse.json({ items });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ organization: string }> }
) {
  const { organization } = await context.params;
  const gate = await requireOrgApi(organization, { mutate: true });
  if (gate.error) return gate.error;
  const body = await request.json();
  const kind = body.kind as "products" | "issues" | "passports" | "audit_logs";
  const { data: profile } = await gate.access.client.from("profiles").select("id").eq("auth_user_id", gate.access.actor.enterpriseAuthUserId).maybeSingle();
  const result = await createGovernedExport(
    gate.access.client,
    gate.access.membership.organizationId,
    kind,
    profile?.id || null
  );
  return NextResponse.json(result);
}
