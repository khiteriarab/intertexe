import { NextRequest, NextResponse } from "next/server";
import { requireOrgApi } from "../../../../../../lib/enterprise/api-auth";
import {
  createApprovalRequest,
  decideApprovalRequest,
  listApprovalRequests,
} from "../../../../../../lib/enterprise/approvals";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ organization: string }> }
) {
  const { organization } = await context.params;
  const gate = await requireOrgApi(organization);
  if (gate.error) return gate.error;
  const status = request.nextUrl.searchParams.get("status") || undefined;
  const items = await listApprovalRequests(
    gate.access.client,
    gate.access.membership.organizationId,
    status as "pending" | "approved" | "rejected" | "cancelled" | undefined
  );
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
  const { data: profile } = await gate.access.client.from("profiles").select("id").eq("auth_user_id", gate.access.actor.enterpriseAuthUserId).maybeSingle();
  const id = await createApprovalRequest({
    client: gate.access.client,
    organizationId: gate.access.membership.organizationId,
    subjectType: body.subjectType,
    subjectId: body.subjectId,
    title: String(body.title || "Approval request"),
    detail: body.detail,
    requestComment: body.requestComment,
    assignedTo: body.assignedTo || null,
    requestedBy: profile?.id || null,
  });
  return NextResponse.json({ ok: true, id });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ organization: string }> }
) {
  const { organization } = await context.params;
  const gate = await requireOrgApi(organization, { mutate: true });
  if (gate.error) return gate.error;
  const body = await request.json();
  const { data: profile } = await gate.access.client.from("profiles").select("id").eq("auth_user_id", gate.access.actor.enterpriseAuthUserId).maybeSingle();
  if (!profile?.id || !body.approvalRequestId || !body.status) {
    return NextResponse.json({ message: "Invalid request." }, { status: 400 });
  }
  await decideApprovalRequest({
    client: gate.access.client,
    organizationId: gate.access.membership.organizationId,
    approvalRequestId: body.approvalRequestId,
    status: body.status,
    decidedBy: profile.id,
    decisionComment: body.decisionComment,
  });
  return NextResponse.json({ ok: true });
}
