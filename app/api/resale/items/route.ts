import { NextResponse } from "next/server";
import { resolvePublicPassport } from "../../../../lib/enterprise/public-resolver";
import { requireResaleUserId } from "../../../../lib/enterprise/resale-auth";
import {
  createResaleItem,
  publishToProviders,
  resolveIdentityByPublicId,
  upsertResaleProfile,
} from "../../../../lib/enterprise/resale-service";
import type { MarketplaceProvider } from "../../../../lib/resale/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const userId = await requireResaleUserId(request);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json()) as {
    publicId?: string;
    conditionGrade?: string;
    conditionNotes?: string;
    flaws?: string;
    askingPrice?: number;
    minimumPrice?: number;
    currency?: string;
    consumerPhotos?: string[];
    providers?: MarketplaceProvider[];
    publish?: boolean;
  };

  if (!body.publicId || !body.conditionGrade || body.askingPrice == null) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  if (!body.consumerPhotos?.length) {
    return NextResponse.json(
      { error: "photos_required", message: "Consumer-uploaded photos required for resale listings." },
      { status: 400 }
    );
  }

  const view = await resolvePublicPassport(body.publicId);
  if (!view.found || !view.consumer) {
    return NextResponse.json({ error: "passport_not_found" }, { status: 404 });
  }
  if (!view.consumer.resaleEligible) {
    return NextResponse.json(
      {
        error: "resale_blocked",
        integrityStatus: view.consumer.integrityStatus,
        message: "Passport data conflict — resale blocked until reviewed.",
      },
      { status: 422 }
    );
  }

  const identity = await resolveIdentityByPublicId(body.publicId);
  if (!identity) return NextResponse.json({ error: "identity_not_found" }, { status: 404 });

  await upsertResaleProfile(userId);

  const itemId = await createResaleItem({
    userId,
    identity,
    conditionGrade: body.conditionGrade,
    conditionNotes: body.conditionNotes,
    flaws: body.flaws,
    askingPrice: body.askingPrice,
    minimumPrice: body.minimumPrice,
    currency: body.currency || "USD",
    consumerPhotos: body.consumerPhotos,
    integrityStatus: view.consumer.integrityStatus || "valid",
    resaleEligible: true,
  });

  if (!body.publish || !body.providers?.length) {
    return NextResponse.json({ resaleItemId: itemId, status: "draft" });
  }

  const draft = {
    title: `${view.consumer.brand ? `${view.consumer.brand} ` : ""}${view.consumer.productName}`.slice(0, 80),
    description: buildDescription(view.consumer, body),
    brand: view.consumer.brand,
    category: view.consumer.category,
    composition: view.consumer.composition,
    condition: body.conditionGrade,
    conditionNotes: body.conditionNotes,
    flaws: body.flaws,
    color: view.consumer.color,
    size: null,
    askingPrice: body.askingPrice,
    currency: body.currency || "USD",
    consumerPhotos: body.consumerPhotos,
    productIdentity: view.consumer.identifier || body.publicId,
    publicId: body.publicId,
  };

  const listings = await publishToProviders({
    userId,
    resaleItemId: itemId,
    providers: body.providers,
    draft,
  });

  return NextResponse.json({ resaleItemId: itemId, status: "listed", listings });
}

function buildDescription(
  consumer: NonNullable<Awaited<ReturnType<typeof resolvePublicPassport>>["consumer"]>,
  body: { conditionGrade?: string; conditionNotes?: string; flaws?: string }
) {
  return [
    consumer.productName,
    consumer.composition ? `Composition: ${consumer.composition}` : null,
    body.conditionGrade ? `Condition: ${body.conditionGrade}` : null,
    body.conditionNotes,
    body.flaws ? `Flaws: ${body.flaws}` : null,
    "Verified INTERTEXE Digital Product Passport.",
  ]
    .filter(Boolean)
    .join("\n");
}
