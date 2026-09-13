import { NextResponse } from "next/server";
import { createResaleSession } from "../../../../lib/enterprise/resale-session-service";
import { requireResaleUserId } from "../../../../lib/enterprise/resale-auth";
import { resolvePublicPassport } from "../../../../lib/enterprise/public-resolver";

export const dynamic = "force-dynamic";

/** Consumer or hosted passport: start a resale session. */
export async function POST(request: Request) {
  const body = (await request.json()) as {
    publicId?: string;
    brandClientRef?: string;
  };

  if (!body.publicId) {
    return NextResponse.json({ error: "missing_public_id" }, { status: 400 });
  }

  const view = await resolvePublicPassport(body.publicId);
  if (!view.found || !view.consumer) {
    return NextResponse.json({ error: "passport_not_found" }, { status: 404 });
  }
  if (!view.consumer.resaleEligible) {
    return NextResponse.json(
      { error: "resale_blocked", integrityStatus: view.consumer.integrityStatus },
      { status: 422 }
    );
  }

  const userId = await requireResaleUserId(request);

  const session = await createResaleSession({
    publicId: body.publicId,
    consumer: view.consumer,
    ownerUserId: userId || null,
    initiatedBy: "consumer",
    brandClientRef: body.brandClientRef,
  });

  return NextResponse.json({
    sessionId: session.sessionId,
    status: session.status,
    expiresAt: session.expiresAt,
    valuation: session.valuation,
    routes: session.routes,
    listingDraft: session.listingDraft,
  });
}
