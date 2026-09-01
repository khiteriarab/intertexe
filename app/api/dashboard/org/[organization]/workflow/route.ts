import { NextRequest, NextResponse } from "next/server";
import { getOrganizationAccess, requireOrganizationMutation } from "../../../../../../lib/enterprise/access";
import { mergeWorkflowAssignments, type WorkflowStageId } from "../../../../../../lib/enterprise/workflow";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ organization: string }> }
) {
  const { organization } = await context.params;
  const access = await getOrganizationAccess(organization);
  if (!access.ok) {
    return NextResponse.json({ message: access.message }, { status: access.status });
  }
  const { data } = await access.client
    .from("organizations")
    .select("entitlements")
    .eq("id", access.membership.organizationId)
    .maybeSingle();
  return NextResponse.json({ entitlements: data?.entitlements || {} });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ organization: string }> }
) {
  const { organization } = await context.params;
  const access = await requireOrganizationMutation(organization);

  let body: {
    assignments?: Partial<
      Record<WorkflowStageId, { profileId?: string | null; dueDate?: string | null }>
    >;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const { data: org } = await access.client
    .from("organizations")
    .select("entitlements")
    .eq("id", access.membership.organizationId)
    .maybeSingle();

  const current = (org?.entitlements || {}) as Record<string, unknown>;
  const next = mergeWorkflowAssignments(current, body.assignments || {});

  const { error } = await access.client
    .from("organizations")
    .update({ entitlements: next })
    .eq("id", access.membership.organizationId);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, entitlements: next });
}
