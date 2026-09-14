import { NextRequest, NextResponse } from "next/server";
import { requireOrgApi } from "../../../../../../../lib/enterprise/api-auth";
import {
  appendIssueNote,
  applyIdentifierDecision,
  assignIssueOwner,
  resolveIssue,
  type IdentifierDecisionAction,
} from "../../../../../../../lib/enterprise/review";

export const dynamic = "force-dynamic";

const IDENTIFIER_ACTIONS: IdentifierDecisionAction[] = [
  "confirm_same_product",
  "treat_as_separate",
  "correct_identifier",
];

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ organization: string; id: string }> }
) {
  const { organization, id } = await context.params;
  const gate = await requireOrgApi(organization, { mutate: true });
  if (gate.error) return gate.error;
  const body = await request.json();
  const action = body.action as IdentifierDecisionAction | "assign" | "note" | undefined;
  try {
    if (action === "assign") {
      await assignIssueOwner({
        client: gate.access.client,
        organizationId: gate.access.membership.organizationId,
        issueId: id,
        assigneeId: body.assigneeId ? String(body.assigneeId) : null,
      });
      return NextResponse.json({ ok: true });
    }
    if (action === "note") {
      await appendIssueNote({
        client: gate.access.client,
        organizationId: gate.access.membership.organizationId,
        issueId: id,
        note: String(body.note || ""),
      });
      return NextResponse.json({ ok: true });
    }
    if (action && IDENTIFIER_ACTIONS.includes(action as IdentifierDecisionAction)) {
      await applyIdentifierDecision({
        client: gate.access.client,
        organizationId: gate.access.membership.organizationId,
        issueId: id,
        action: action as IdentifierDecisionAction,
        correctedIdentifier: body.correctedIdentifier,
      });
      return NextResponse.json({ ok: true });
    }
    const status = body.status as "resolved" | "rejected" | "not_applicable";
    if (!["resolved", "rejected", "not_applicable"].includes(status)) {
      return NextResponse.json({ message: "Invalid status." }, { status: 400 });
    }
    await resolveIssue({
      client: gate.access.client,
      organizationId: gate.access.membership.organizationId,
      issueId: id,
      status,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Update failed." },
      { status: 400 }
    );
  }
}
