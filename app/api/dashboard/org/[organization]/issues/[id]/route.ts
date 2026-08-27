import { NextRequest, NextResponse } from "next/server";
import { requireOrgApi } from "../../../../../../../lib/enterprise/api-auth";
import { resolveIssue } from "../../../../../../../lib/enterprise/review";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ organization: string; id: string }> }
) {
  const { organization, id } = await context.params;
  const gate = await requireOrgApi(organization, { mutate: true });
  if (gate.error) return gate.error;
  const body = await request.json();
  const status = body.status as "resolved" | "rejected" | "not_applicable";
  if (!["resolved", "rejected", "not_applicable"].includes(status)) {
    return NextResponse.json({ message: "Invalid status." }, { status: 400 });
  }
  try {
    await resolveIssue({
      organizationId: gate.access.membership.organizationId,
      issueId: id,
      status,
      actorEmail: gate.access.actor.email,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Update failed." },
      { status: 400 }
    );
  }
}
