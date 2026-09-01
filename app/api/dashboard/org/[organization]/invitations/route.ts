import { NextRequest, NextResponse } from "next/server";
import { requireOrganizationMutation } from "../../../../../../lib/enterprise/access";
import {
  createOrganizationInvitation,
  listOrganizationInvitations,
} from "../../../../../../lib/enterprise/founder-invitations";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ organization: string }> }
) {
  const { organization } = await context.params;
  const access = await requireOrganizationMutation(organization);
  if (!["owner", "admin"].includes(access.membership.role)) {
    return NextResponse.json({ message: "Not allowed." }, { status: 403 });
  }
  const invitations = await listOrganizationInvitations(access.client, access.membership.organizationId);
  return NextResponse.json({ invitations });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ organization: string }> }
) {
  const { organization } = await context.params;
  const access = await requireOrganizationMutation(organization);
  if (!["owner", "admin"].includes(access.membership.role)) {
    return NextResponse.json({ message: "Not allowed." }, { status: 403 });
  }

  let body: { email?: string; role?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const email = String(body.email || "").trim();
  const role = String(body.role || "reviewer").trim();
  if (!email) return NextResponse.json({ message: "Email is required." }, { status: 400 });

  try {
    const created = await createOrganizationInvitation({
      client: access.client,
      organizationId: access.membership.organizationId,
      email,
      role,
      actorEmail: access.actor.email,
      auditAction: "org_settings_invitation_created",
    });
    return NextResponse.json({ ok: true, invitePath: created.invitePath });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Could not create invitation." },
      { status: 500 }
    );
  }
}
