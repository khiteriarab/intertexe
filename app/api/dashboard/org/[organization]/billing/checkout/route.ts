import { NextRequest, NextResponse } from "next/server";
import { requireOrgApi } from "../../../../../../../lib/enterprise/api-auth";
import {
  checkoutPricesForPlan,
  createPaddleCheckout,
  defaultCheckoutPriceForPlan,
  isPaddleConfigured,
} from "../../../../../../../lib/enterprise/paddle";
import { normalizePlanKey, type PlanKey } from "../../../../../../../lib/enterprise/plans";

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
  const isImplementationOnly = plan === "implementation";
  const normalizedPlan = plan && !isImplementationOnly ? normalizePlanKey(plan) : null;
  const checkoutBundle =
    normalizedPlan === "professional" || normalizedPlan === "platform"
      ? checkoutPricesForPlan(normalizedPlan as PlanKey)
      : null;
  const priceId = String(
    body.priceId ||
      (plan === "implementation"
        ? process.env.PADDLE_PRICE_IMPLEMENTATION || process.env.PADDLE_PRICE_FOUNDING_PILOT
        : normalizedPlan
          ? defaultCheckoutPriceForPlan(normalizedPlan as PlanKey)
          : "") ||
      ""
  ).trim();
  if (!priceId) {
    return NextResponse.json({ message: "Missing Paddle price ID." }, { status: 400 });
  }

  const includeImplementation = body.includeImplementation !== false;
  const additionalPriceIds =
    includeImplementation &&
    checkoutBundle?.implementationPriceId &&
    normalizedPlan !== "founding_pilot"
      ? [checkoutBundle.implementationPriceId]
      : undefined;

  const origin = request.nextUrl.origin;
  const successUrl =
    String(body.successUrl || "").trim() ||
    `${origin}/dashboard/${organization}?activated=${normalizedPlan || "professional"}`;
  const cancelUrl =
    String(body.cancelUrl || "").trim() ||
    `${origin}/dashboard/${organization}/settings?billing=cancel`;

  try {
    const checkout = await createPaddleCheckout({
      organizationId: gate.access.membership.organizationId,
      organizationSlug: organization,
      priceId,
      additionalPriceIds,
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
