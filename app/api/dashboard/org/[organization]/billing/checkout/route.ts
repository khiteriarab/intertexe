import { NextRequest, NextResponse } from "next/server";
import { requireOrgApi } from "../../../../../../../lib/enterprise/api-auth";
import { createPaddleCheckout, isPaddleConfigured } from "../../../../../../../lib/enterprise/paddle";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ organization: string }> }
) {
  const { organization } = await context.params;
  const gate = await requireOrgApi(organization, { mutate: false });
  if (gate.error) return gate.error;
  if (!["owner", "admin"].includes(gate.access.membership.role)) {
    return NextResponse.json({ message: "Admin access required." }, { status: 403 });
  }
  if (!isPaddleConfigured()) {
    return NextResponse.json({ message: "Paddle billing is not configured." }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const requestedOrgId = body.organizationId ? String(body.organizationId) : null;
  if (requestedOrgId && requestedOrgId !== gate.access.membership.organizationId) {
    return NextResponse.json({ message: "Organization mismatch." }, { status: 403 });
  }

  const plan = body.plan ? String(body.plan) : null;
  const priceId = String(
    body.priceId ||
      (plan === "platform"
        ? process.env.PADDLE_PRICE_PLATFORM || process.env.PADDLE_PRICE_SAAS_PLATFORM
        : plan === "professional"
          ? process.env.PADDLE_PRICE_PROFESSIONAL || process.env.PADDLE_PRICE_SAAS_PROFESSIONAL
          : plan === "implementation"
            ? process.env.PADDLE_PRICE_IMPLEMENTATION || process.env.PADDLE_PRICE_FOUNDING_PILOT
            : "") ||
      ""
  ).trim();
  if (!priceId) {
    return NextResponse.json({ message: "Missing Paddle price ID." }, { status: 400 });
  }

  const origin = request.nextUrl.origin;
  const successUrl =
    String(body.successUrl || "").trim() ||
    `${origin}/dashboard/${organization}/settings?billing=success`;
  const cancelUrl =
    String(body.cancelUrl || "").trim() ||
    `${origin}/dashboard/${organization}/settings?billing=cancel`;

  try {
    const checkout = await createPaddleCheckout({
      organizationId: gate.access.membership.organizationId,
      organizationSlug: organization,
      priceId,
      customerEmail: body.email ? String(body.email) : null,
      successUrl,
      cancelUrl,
    });
    return NextResponse.json({ ok: true, ...checkout });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Checkout failed." },
      { status: 502 }
    );
  }
}
