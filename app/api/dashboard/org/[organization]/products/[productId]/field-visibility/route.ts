import { NextRequest, NextResponse } from "next/server";
import { requireOrgApi } from "@/lib/enterprise/api-auth";

const ALLOWED = new Set(["public", "internal", "restricted", "supply_chain"]);

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ organization: string; productId: string }> }
) {
  const { organization, productId } = await context.params;
  const gate = await requireOrgApi(organization, { mutate: true });
  if (gate.error) return gate.error;

  const body = await request.json();
  const fieldId = String(body.fieldId || "");
  const accessClass = String(body.accessClass || "");
  if (!fieldId || !ALLOWED.has(accessClass)) {
    return NextResponse.json({ message: "fieldId and valid accessClass required." }, { status: 400 });
  }

  const { data: field } = await gate.access.client
    .from("normalized_fields")
    .select("id, field_key, organization_id, product_id")
    .eq("id", fieldId)
    .eq("organization_id", gate.access.membership.organizationId)
    .eq("product_id", productId)
    .maybeSingle();

  if (!field?.id) {
    return NextResponse.json({ message: "Field not found." }, { status: 404 });
  }

  if (["composition", "manufacturing_country"].includes(field.field_key) && accessClass !== "public") {
    return NextResponse.json(
      { message: "Composition and manufacturing country must remain public for DPP Phase 1." },
      { status: 400 }
    );
  }

  const { error } = await gate.access.client
    .from("normalized_fields")
    .update({ access_class: accessClass })
    .eq("id", fieldId)
    .eq("organization_id", gate.access.membership.organizationId);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
