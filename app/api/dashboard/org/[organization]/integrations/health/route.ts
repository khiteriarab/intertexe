import { NextRequest, NextResponse } from "next/server";
import { requireOrgApi } from "../../../../../../../lib/enterprise/api-auth";
import { loadIntegrationHealth, retryIntegration } from "../../../../../../../lib/enterprise/integration-health";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ organization: string }> }
) {
  const { organization } = await context.params;
  const gate = await requireOrgApi(organization);
  if (gate.error) return gate.error;
  const connections = await loadIntegrationHealth(gate.access.client, gate.access.membership.organizationId);
  return NextResponse.json({ connections });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ organization: string }> }
) {
  const { organization } = await context.params;
  const gate = await requireOrgApi(organization, { mutate: true });
  if (gate.error) return gate.error;
  const body = await request.json();
  if (body.action === "retry" && body.connectionId) {
    const runId = await retryIntegration(
      gate.access.client,
      gate.access.membership.organizationId,
      body.connectionId
    );
    return NextResponse.json({ ok: true, runId });
  }
  return NextResponse.json({ message: "Unknown action." }, { status: 400 });
}
