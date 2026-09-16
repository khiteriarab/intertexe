import { NextResponse } from "next/server";
import { authenticateApiRequest } from "../../../../../lib/enterprise/api-auth";
import { buildHeadlessProductPayload } from "../../../../../lib/enterprise/headless-product-payload";
import { loadOrgProduct } from "../../../../../lib/enterprise/queries";
import { createEnterpriseServiceClient } from "../../../../../lib/enterprise/supabase-service";
import { loadProductImpactBundle } from "../../../../../lib/sustainability/product-impact";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params;

  let client;
  try {
    client = createEnterpriseServiceClient();
  } catch {
    return NextResponse.json({ error: "Service unavailable", message: "Enterprise API is not configured" }, { status: 503 });
  }

  const auth = await authenticateApiRequest(client, request.headers.get("authorization"));
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized", message: auth.message }, { status: auth.status });
  }

  const { organizationId, slug } = auth;

  const detail = await loadOrgProduct(client, organizationId, productId);
  if (!detail?.product) {
    return NextResponse.json({ error: "Not found", message: "Product not found" }, { status: 404 });
  }

  const impactBundle = await loadProductImpactBundle(client, organizationId, slug, detail.product);
  const payload = buildHeadlessProductPayload({
    product: detail.product,
    impact: impactBundle.impact,
    traceabilityScore: impactBundle.traceabilityScore,
  });

  return NextResponse.json({
    api_version: "v1",
    product: payload,
  });
}
