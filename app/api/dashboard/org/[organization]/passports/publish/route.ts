import { NextRequest, NextResponse } from "next/server";
import { requireOrgApi } from "../../../../../../../lib/enterprise/api-auth";
import { publishabilityForProduct, publishProductPassport } from "../../../../../../../lib/enterprise/publish";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ organization: string }> }
) {
  const { organization } = await context.params;
  const gate = await requireOrgApi(organization, { mutate: true });
  if (gate.error) return gate.error;
  const body = await request.json();
  const productId = String(body.productId || "");
  if (!productId) return NextResponse.json({ message: "productId required." }, { status: 400 });
  const check = await publishabilityForProduct(gate.access.membership.organizationId, productId);
  if (body.previewOnly) return NextResponse.json(check);
  try {
    const published = await publishProductPassport({
      organizationId: gate.access.membership.organizationId,
      productId,
      actorEmail: gate.access.actor.email,
    });
    return NextResponse.json({ ok: true, ...published });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Publish failed.", check },
      { status: 400 }
    );
  }
}
