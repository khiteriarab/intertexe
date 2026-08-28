import { NextRequest, NextResponse } from "next/server";
import { requireHqSession } from "../../../../../../lib/dashboard/auth";
import { getEnterpriseServiceClient, isEnterpriseConfigured } from "../../../../../../lib/enterprise/client";
import { provisionBrandOperator } from "../../../../../../lib/enterprise/provision-brand-operator";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

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
  const email = String(body.email || "").trim().toLowerCase();
  const fullName = String(body.fullName || "").trim();
  const role = String(body.role || "product_manager").trim();
  const confirmCrossOrg = Boolean(body.confirmCrossOrg);

  if (!email || !fullName) {
    return NextResponse.json({ message: "Email and full name are required." }, { status: 400 });
  }

  try {
    const result = await provisionBrandOperator({
      client: supabase,
      organizationId: id,
      email,
      fullName,
      role,
      actorEmail: session.email,
      confirmCrossOrg,
    });

    if (result.status === "needs_cross_org_confirmation") {
      return NextResponse.json(
        {
          ok: false,
          code: "cross_org_membership",
          message: result.message,
          otherOrganizations: result.otherOrganizations,
        },
        { status: 409 }
      );
    }

    const payload: Record<string, unknown> = {
      ok: true,
      status: result.status,
      message: result.message,
      profileId: result.profileId,
      authUserId: result.authUserId,
      membershipRole: result.membershipRole,
    };
    if (result.status === "provisioned") {
      payload.setupLink = result.setupLink;
      payload.setupLinkKind = result.setupLinkKind;
      if (result.setupLinkKind === "transitional_password" && result.transitionalPassword) {
        payload.transitionalPassword = result.transitionalPassword;
        payload.transitional = true;
      }
    }

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Could not provision operator." },
      { status: 400 }
    );
  }
}
