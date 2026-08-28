import { NextRequest, NextResponse } from "next/server";
import { requireHqSession } from "../../../../../../../lib/dashboard/auth";
import { getEnterpriseServiceClient, isEnterpriseConfigured } from "../../../../../../../lib/enterprise/client";
import {
  listOrganizationInvitations,
  regenerateOrganizationInvitation,
  revokePendingInvitations,
} from "../../../../../../../lib/enterprise/founder-invitations";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const session = await requireHqSession({ roles: ["founder"] });
  void session;
  const { id } = await context.params;
  const supabase = getEnterpriseServiceClient();
  if (!supabase) {
    return NextResponse.json({ message: "Enterprise database is not linked." }, { status: 503 });
  }
  const { data: org } = await supabase.from("organizations").select("id, slug, name").eq("id", id).maybeSingle();
  if (!org) return NextResponse.json({ message: "Organization not found." }, { status: 404 });

  const invitations = await listOrganizationInvitations(supabase, id);
  return NextResponse.json({ ok: true, organization: org, invitations });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const session = await requireHqSession({ roles: ["founder"] });
  if (!isEnterpriseConfigured()) {
    return NextResponse.json({ message: "Enterprise database is not linked." }, { status: 503 });
  }
  const supabase = getEnterpriseServiceClient();
  if (!supabase) {
    return NextResponse.json({ message: "Enterprise database is not linked." }, { status: 503 });
  }

  const { id } = await context.params;
  const body = await request.json();
  const action = String(body.action || "").trim();

  const { data: org } = await supabase
    .from("organizations")
    .select("id, slug, name")
    .eq("id", id)
    .maybeSingle();
  if (!org) return NextResponse.json({ message: "Organization not found." }, { status: 404 });

  if (action === "revoke") {
    const email = body.email ? String(body.email).trim().toLowerCase() : undefined;
    const revoked = await revokePendingInvitations({
      client: supabase,
      organizationId: id,
      actorEmail: session.email,
      email,
    });
    const invitations = await listOrganizationInvitations(supabase, id);
    return NextResponse.json({ ok: true, revoked, invitations });
  }

  if (action === "regenerate") {
    const email = String(body.email || "").trim().toLowerCase();
    const role = String(body.role || "owner").trim();
    if (!email) {
      return NextResponse.json({ message: "Contact email is required to regenerate an invite." }, { status: 400 });
    }
    const regenerated = await regenerateOrganizationInvitation({
      client: supabase,
      organizationId: id,
      email,
      role,
      actorEmail: session.email,
    });
    const invitations = await listOrganizationInvitations(supabase, id);
    return NextResponse.json({
      ok: true,
      invitePath: regenerated.invitePath,
      inviteUrl: regenerated.inviteUrl,
      invitations,
      emailDelivery: "not_sent",
    });
  }

  return NextResponse.json({ message: "Unknown action." }, { status: 400 });
}
