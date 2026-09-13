import { NextRequest, NextResponse } from "next/server";
import { requireOrgApi } from "../../../../../../../lib/enterprise/api-auth";
import {
  createPaddleCustomerPortalSession,
  isPaddleConfigured,
} from "../../../../../../../lib/enterprise/paddle";
import { orgBillingUrl } from "../../../../../../../lib/enterprise/org-routes";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ organization: string }> }
) {
  const { organization } = await context.params;
  const gate = await requireOrgApi(organization);
  if (gate.error) return gate.error;
  if (!["owner", "admin"].includes(gate.access.membership.role)) {
    return NextResponse.json({ message: "Admin access required." }, { status: 403 });
  }
  if (!isPaddleConfigured()) {
    return NextResponse.json({ message: "Paddle billing is not configured." }, { status: 503 });
  }

  const { data: billing } = await gate.access.client
    .from("billing_accounts")
    .select("paddle_customer_id")
    .eq("organization_id", gate.access.membership.organizationId)
    .maybeSingle();

  const paddleCustomerId = billing?.paddle_customer_id;
  if (!paddleCustomerId) {
    return NextResponse.json({ message: "No Paddle customer on file for this workspace." }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const origin = request.nextUrl.origin;
  const returnUrl =
    String(body.returnUrl || "").trim() || `${origin}${orgBillingUrl(gate.access.membership.slug)}`;

  try {
    const { portalUrl } = await createPaddleCustomerPortalSession({
      paddleCustomerId: String(paddleCustomerId),
      returnUrl,
    });
    return NextResponse.json({ portalUrl });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Could not open customer portal." },
      { status: 502 }
    );
  }
}
