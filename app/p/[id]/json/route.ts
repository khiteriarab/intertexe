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
  });
}
