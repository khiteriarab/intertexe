import { NextRequest, NextResponse } from "next/server";
import { createPaddleModuleCheckout, isPaddleConfigured } from "../../../../../lib/enterprise/paddle";
import {
  estimateModules,
  paddlePriceIdForModule,
  pricingModuleByKey,
} from "../../../../../lib/enterprise/pricing-modules";

export const dynamic = "force-dynamic";

/** Public module checkout — hands the selected license modules to Paddle. */
export async function POST(request: NextRequest) {
  if (!isPaddleConfigured()) {
    return NextResponse.json(
      { message: "Checkout is not configured. Request a written proposal instead." },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const requested: string[] = Array.isArray(body.modules) ? body.modules.map(String) : [];
  const keys = requested.filter((key) => Boolean(pricingModuleByKey(key)));
  if (!keys.length) {
    return NextResponse.json({ message: "Select at least one module." }, { status: 400 });
  }

  const estimate = estimateModules(keys);
  if (estimate.requiresProposal) {
    return NextResponse.json(
      { message: "That selection is scoped in a written proposal." },
      { status: 409 },
    );
  }

  const priceIds: string[] = [];
  for (const key of estimate.pricedKeys) {
    const priceId = paddlePriceIdForModule(key);
    if (!priceId) {
      return NextResponse.json(
        { message: "This module is not yet available for self-serve checkout." },
        { status: 503 },
      );
    }
    priceIds.push(priceId);
  }

  const origin = request.nextUrl.origin;
  try {
    const checkout = await createPaddleModuleCheckout({
      priceIds,
      moduleKeys: estimate.pricedKeys,
      customerEmail: body.email ? String(body.email) : null,
      successUrl: `${origin}/platform/pricing?checkout=complete`,
    });
    return NextResponse.json({ ok: true, ...checkout });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Checkout failed." },
      { status: 502 },
    );
  }
}
