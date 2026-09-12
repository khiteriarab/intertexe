import { NextResponse } from "next/server";
import { resolvePublicPassport } from "../../../../lib/enterprise/public-resolver";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const view = await resolvePublicPassport(id);
  if (!view.found) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({
    public_id: view.publicId,
    product_name: view.productName,
    version: view.versionNumber,
    data: view.snapshot || {},
    product: view.consumer
      ? {
          brand: view.consumer.brand,
          name: view.consumer.productName,
          category: view.consumer.category,
          composition: view.consumer.composition,
          image_url: view.consumer.imageUrl,
        }
      : null,
    lifecycle: view.consumer?.lifecycleEvents || [],
    care: view.consumer?.careInstructions || null,
    next_life: view.consumer?.nextLife || [],
    resale_availability: {
      eligible: view.consumer?.resaleEligible ?? false,
      integrity_status: view.consumer?.integrityStatus ?? "unknown",
      sell_url: view.consumer?.resaleEligible ? `/p/${view.publicId}/sell` : null,
    },
  });
}
