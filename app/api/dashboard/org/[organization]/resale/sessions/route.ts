import { NextRequest, NextResponse } from "next/server";
import { requireOrgApi } from "../../../../../../../lib/enterprise/api-auth";
import { createResaleSession } from "../../../../../../../lib/enterprise/resale-session-service";
import { resolvePublicPassport } from "../../../../../../../lib/enterprise/public-resolver";

export const dynamic = "force-dynamic";

/**
 * Brand Product API — start a white-label resale session for an authenticated owner.
 * Returns sessionId; brand embeds sell flow without handling marketplace OAuth.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ organization: string }> }
) {
  const { organization } = await context.params;
  const gate = await requireOrgApi(organization, { mutate: true });
  if (gate.error) return gate.error;

  const body = (await request.json()) as {
    publicId?: string;
    ownerUserId?: string;
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
    return NextResponse.json({ error: "resale_blocked" }, { status: 422 });
  }

  const session = await createResaleSession({
    publicId: body.publicId,
    consumer: view.consumer,
    ownerUserId: body.ownerUserId,
    initiatedBy: "brand",
    brandClientRef: body.brandClientRef,
    organizationId: gate.access.membership.organizationId,
  });

  return NextResponse.json({
    sessionId: session.sessionId,
    sellUrl: `/p/${body.publicId}/sell?session=${session.sessionId}`,
    valuation: session.valuation,
    routes: session.routes,
  });
}
