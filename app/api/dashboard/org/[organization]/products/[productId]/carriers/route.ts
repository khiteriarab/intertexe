import { NextRequest, NextResponse } from "next/server";
import { requireOrgApi } from "../../../../../../../lib/enterprise/api-auth";
import {
  loadProductCarriers,
  provisionDraftQrCarrier,
  registerCarrierType,
  retireCarrier,
  type CarrierType,
} from "../../../../../../../lib/enterprise/carriers";
import { publishabilityForProduct } from "../../../../../../../lib/enterprise/publish";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ organization: string; productId: string }> }
) {
  const { organization, productId } = await context.params;
  const gate = await requireOrgApi(organization);
  if (gate.error) return gate.error;

  const carriers = await loadProductCarriers(
    gate.access.client,
    gate.access.membership.organizationId,
    productId
  );
  return NextResponse.json({ carriers });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ organization: string; productId: string }> }
) {
  const { organization, productId } = await context.params;
  const gate = await requireOrgApi(organization, { mutate: true });
  if (gate.error) return gate.error;

  const body = await request.json();
  const action = String(body.action || "");

  if (action === "retire") {
    const carrierId = String(body.carrierId || "");
    if (!carrierId) {
      return NextResponse.json({ message: "carrierId required." }, { status: 400 });
    }
    try {
      await retireCarrier(gate.access.client, gate.access.membership.organizationId, carrierId);
      return NextResponse.json({ ok: true });
    } catch (error) {
      return NextResponse.json(
        { message: error instanceof Error ? error.message : "Retire failed." },
        { status: 400 }
      );
    }
  }

  if (action === "provision") {
    const check = await publishabilityForProduct(
      gate.access.client,
      gate.access.membership.organizationId,
      productId
    );
    if (check.status === "blocked") {
      return NextResponse.json(
        { message: `Product not ready: ${check.blockers.join("; ")}` },
        { status: 400 }
      );
    }

    const carrierType = String(body.carrierType || "qr") as CarrierType;
    try {
      const carrier =
        carrierType === "qr"
          ? await provisionDraftQrCarrier(
              gate.access.client,
              gate.access.membership.organizationId,
              productId,
              {
                artworkVariant: body.artworkVariant,
                batchLabel: body.batchLabel,
              }
            )
          : await registerCarrierType(gate.access.client, {
              organizationId: gate.access.membership.organizationId,
              productId,
              carrierType,
              artworkVariant: body.artworkVariant,
              batchLabel: body.batchLabel,
              encodingFormat: body.encodingFormat,
              metadata: body.metadata,
            });
      return NextResponse.json({ ok: true, carrier });
    } catch (error) {
      return NextResponse.json(
        { message: error instanceof Error ? error.message : "Provision failed." },
        { status: 400 }
      );
    }
  }

  return NextResponse.json({ message: "Unknown action." }, { status: 400 });
}
